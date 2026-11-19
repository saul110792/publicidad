/**
 * Lista de remarketing (post-venta): clientes cuyo último pedido fue de piezas sueltas hace
 * 15 días o más y que nunca han comprado un paquete. A cada uno se le sugiere el paquete que
 * más se parece a lo que compró. El envío automático queda para después: por ahora se exporta.
 */
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { customers, orderItems, orders, products } from '../db/schema';
import { loadPackages } from './catalogData';
import { findBestOffer, type MatchPackage } from './packageMatch';

export const REMARKETING_DAYS = 15;

export type RemarketingRow = {
  nombre: string;
  whatsapp: string;
  correo: string | null;
  giro: string | null;
  ultimoFolio: string;
  ultimaCompra: string;
  dias: number;
  compro: string[];
  paquete: string | null;
  paqueteSlug: string | null;
  leFaltan: string[];
  precioPaquete: number | null;
};

export async function getRemarketingList(now = new Date()): Promise<RemarketingRow[]> {
  const limite = new Date(now.getTime() - REMARKETING_DAYS * 24 * 60 * 60 * 1000);

  // Último pedido de cada cliente, y si alguna vez compró un paquete.
  const candidatos = await db.execute<{
    customer_id: number;
    order_id: number;
    folio: string;
    created_at: Date;
  }>(sql`
    select distinct on (o.customer_id) o.customer_id, o.id as order_id, o.folio, o.created_at
    from ${orders} o
    where not exists (
      select 1 from ${orderItems} i join ${orders} o2 on o2.id = i.order_id
      where o2.customer_id = o.customer_id and i.tipo = 'paquete'
    )
    order by o.customer_id, o.created_at desc
  `);
  const due = candidatos.rows.filter((r) => new Date(r.created_at) <= limite);
  if (!due.length) return [];

  const customerIds = due.map((r) => r.customer_id);
  const [clientes, compras, pkgs] = await Promise.all([
    db.select().from(customers).where(inArray(customers.id, customerIds)),
    db
      .select({
        customerId: orders.customerId,
        itemId: orderItems.id,
        slug: products.slug,
        nombre: products.nombre,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(inArray(orders.customerId, customerIds))
      .orderBy(asc(orderItems.id)),
    loadPackages(),
  ]);
  const matchPkgs: MatchPackage[] = pkgs;

  return due
    .map((r) => {
      const c = clientes.find((x) => x.id === r.customer_id)!;
      const suyas = compras.filter((x) => x.customerId === r.customer_id);
      const match = findBestOffer(
        suyas.map((x) => ({ id: String(x.itemId), productSlug: x.slug })),
        matchPkgs,
        [],
        1,
      );
      const pkg = match ? pkgs.find((p) => p.slug === match.slug) : undefined;
      const fecha = new Date(r.created_at);
      return {
        nombre: c.nombre,
        whatsapp: c.whatsapp,
        correo: c.correo,
        giro: c.giro,
        ultimoFolio: r.folio,
        ultimaCompra: fecha.toISOString(),
        dias: Math.floor((now.getTime() - fecha.getTime()) / 86_400_000),
        compro: [...new Set(suyas.map((x) => x.nombre))],
        paquete: pkg ? pkg.nombre : null,
        paqueteSlug: pkg?.slug ?? null,
        leFaltan: pkg && match ? match.missing.map((i) => pkg.items[i]!.etiqueta) : [],
        precioPaquete: pkg?.precio ?? null,
      };
    })
    .sort((a, b) => a.dias - b.dias);
}

export function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  // Evita inyección de fórmulas al abrir el CSV en Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function remarketingCsv(
  rows: RemarketingRow[],
  whatsappLink: (r: RemarketingRow) => string,
) {
  const header = [
    'nombre',
    'whatsapp',
    'correo',
    'giro',
    'ultimo_pedido',
    'fecha',
    'dias',
    'compro',
    'paquete_sugerido',
    'le_faltan',
    'precio_paquete',
    'mensaje_whatsapp',
  ];
  const lines = rows.map((r) =>
    [
      r.nombre,
      r.whatsapp,
      r.correo,
      r.giro,
      r.ultimoFolio,
      r.ultimaCompra.slice(0, 10),
      r.dias,
      r.compro.join(' | '),
      r.paquete,
      r.leFaltan.join(' | '),
      r.precioPaquete == null ? 'por definir' : (r.precioPaquete / 100).toFixed(2),
      whatsappLink(r),
    ]
      .map(csvCell)
      .join(','),
  );
  // BOM para que Excel abra bien los acentos.
  return '﻿' + [header.join(','), ...lines].join('\r\n');
}
