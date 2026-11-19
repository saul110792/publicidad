import { Router } from 'express';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import {
  DELIVERY_METHODS,
  GIROS,
  ORDER_STATUSES,
  ORIGENES,
  PAYMENT_METHODS,
  type AdminLeadRow,
  type AdminOrderDetail,
  type AdminOrderRow,
  type AdminOrdersDTO,
  type CartLineDTO,
  type OrderCreatedDTO,
} from '@publicidad/shared';
import { clientUrl } from '../../config/env';
import { db } from '../../db/client';
import {
  customers,
  leads,
  orderItems,
  orders,
  packages,
  payments,
  products,
} from '../../db/schema';
import { HttpError } from '../../middleware/errors';
import { FOLIO_PATTERN } from '../../services/folio';
import { insertOrder, upsertCustomer } from '../../services/orderStore';
import { escapeLike } from '../../services/catalog';
import { REF_CODE_PATTERN } from '../../services/refCode';
import { parse } from '../../services/validation';

export const adminOrdersRouter = Router();

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((x) => x.value) as unknown as [T[number]['value'], ...T[number]['value'][]];

const PAYMENT_STATES = ['pendiente', 'pagado', 'fallido', 'reembolsado'] as const;
const PAGE_SIZE = 25;

/** Canal de venta: UTM si llegó con una; WhatsApp si viene de un lead o es venta manual. */
export const canalSql = sql<string>`coalesce(
  ${orders.utmSource},
  case when ${orders.refCode} is not null or ${orders.manual} then 'whatsapp' else 'directo' end
)`;

const rowFields = {
  id: orders.id,
  folio: orders.folio,
  createdAt: orders.createdAt,
  cliente: customers.nombre,
  whatsapp: customers.whatsapp,
  total: orders.total,
  estado: orders.estado,
  estadoPago: orders.estadoPago,
  metodoPago: orders.metodoPago,
  entrega: orders.entrega,
  manual: orders.manual,
  packageUpgrade: orders.packageUpgrade,
  refCode: orders.refCode,
  canal: canalSql,
};

const toRow = (r: Omit<AdminOrderRow, 'createdAt'> & { createdAt: Date }): AdminOrderRow => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
});

// --- Lista ---

const listQuery = z.object({
  estado: z.enum(values(ORDER_STATUSES)).optional().catch(undefined),
  estadoPago: z.enum(PAYMENT_STATES).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

adminOrdersRouter.get('/orders', async (req, res) => {
  const q = listQuery.parse(req.query);
  const conds: SQL[] = [];
  if (q.estado) conds.push(eq(orders.estado, q.estado));
  if (q.estadoPago) conds.push(eq(orders.estadoPago, q.estadoPago));
  if (q.q) {
    const like = `%${escapeLike(q.q)}%`;
    conds.push(
      or(
        ilike(orders.folio, like),
        ilike(customers.nombre, like),
        ilike(customers.whatsapp, like),
        ilike(orders.refCode, like),
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const [rows, [count]] = await Promise.all([
    db
      .select(rowFields)
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((q.pagina - 1) * PAGE_SIZE),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(where),
  ]);
  const body: AdminOrdersDTO = { pedidos: rows.map(toRow), total: count?.n ?? 0, pagina: q.pagina };
  res.json(body);
});

// --- Detalle ---

async function loadDetail(folio: string): Promise<AdminOrderDetail> {
  const [o] = await db
    .select({
      ...rowFields,
      correo: customers.correo,
      giro: customers.giro,
      direccion: orders.direccion,
      comoNosConocio: orders.comoNosConocio,
      utmSource: orders.utmSource,
      utmMedium: orders.utmMedium,
      utmCampaign: orders.utmCampaign,
      subtotal: orders.subtotal,
      envio: orders.envio,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.folio, folio))
    .limit(1);
  if (!o) throw new HttpError(404, 'Pedido no encontrado');

  const [items, pays, [lead]] = await Promise.all([
    db
      .select({ item: orderItems, productSlug: products.slug, packageSlug: packages.slug })
      .from(orderItems)
      .leftJoin(products, eq(products.id, orderItems.productId))
      .leftJoin(packages, eq(packages.id, orderItems.packageId))
      .where(eq(orderItems.orderId, o.id))
      .orderBy(asc(orderItems.id)),
    db.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(asc(payments.createdAt)),
    db
      .select({ refCode: leads.refCode, producto: products.nombre, fecha: leads.createdAt })
      .from(leads)
      .leftJoin(products, eq(products.id, leads.productId))
      .where(eq(leads.convertidoAOrderId, o.id))
      .limit(1),
  ]);

  const lineas: CartLineDTO[] = items.map(({ item, productSlug, packageSlug }) => {
    const op = item.opciones as { nombre?: string; detalle?: string[] };
    return {
      id: String(item.id),
      tipo: item.tipo,
      slug: productSlug ?? packageSlug ?? '',
      nombre: op.nombre ?? '',
      imagen: null,
      detalle: op.detalle ?? [],
      cantidad: item.cantidad,
      unidad: '',
      total: item.total,
      archivo: item.archivoUrl ? { url: item.archivoUrl, nombre: 'Archivo de diseño' } : null,
      disponible: true,
    };
  });

  const { utmSource, utmMedium, utmCampaign, ...rest } = o;
  return {
    ...toRow(rest),
    correo: o.correo,
    giro: o.giro,
    direccion: o.direccion,
    comoNosConocio: o.comoNosConocio,
    utm: { source: utmSource, medium: utmMedium, campaign: utmCampaign },
    subtotal: o.subtotal,
    envio: o.envio,
    lineas,
    pagos: pays.map((p) => ({
      proveedor: p.provider,
      referencia: p.providerRef,
      estado: p.estado,
      monto: p.monto,
      fecha: p.createdAt.toISOString(),
    })),
    lead: lead ? { ...lead, fecha: lead.fecha.toISOString() } : null,
    qrUrl: `${clientUrl}/?utm_source=qr&utm_medium=impreso&utm_campaign=pedido-${o.folio}`,
  };
}

const folioParam = z.string().regex(FOLIO_PATTERN);

adminOrdersRouter.get('/orders/:folio', async (req, res) => {
  res.json(await loadDetail(parse(folioParam, req.params.folio)));
});

// --- Actualizar estado / ligar lead ---

const updateBody = z.object({
  estado: z.enum(values(ORDER_STATUSES)).optional(),
  estadoPago: z.enum(PAYMENT_STATES).optional(),
  refCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || REF_CODE_PATTERN.test(v), 'Código con formato XX-XXXX')
    .optional(),
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Liga el pedido con el lead de WhatsApp de ese código (o lo desliga con ''). */
async function linkLead(tx: Tx, orderId: number, refCode: string) {
  await tx
    .update(leads)
    .set({ convertidoAOrderId: null })
    .where(eq(leads.convertidoAOrderId, orderId));
  if (!refCode) {
    await tx.update(orders).set({ refCode: null }).where(eq(orders.id, orderId));
    return;
  }
  const [lead] = await tx.select().from(leads).where(eq(leads.refCode, refCode)).limit(1);
  if (!lead) throw new HttpError(404, `No existe un lead con el código ${refCode}.`);
  if (lead.convertidoAOrderId && lead.convertidoAOrderId !== orderId) {
    throw new HttpError(409, `El código ${refCode} ya está ligado a otro pedido.`);
  }
  await tx.update(leads).set({ convertidoAOrderId: orderId }).where(eq(leads.id, lead.id));
  await tx.update(orders).set({ refCode }).where(eq(orders.id, orderId));
}

adminOrdersRouter.patch('/orders/:folio', async (req, res) => {
  const folio = parse(folioParam, req.params.folio);
  const r = updateBody.safeParse(req.body);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? 'Datos inválidos');
  const input = r.data;

  await db.transaction(async (tx) => {
    const [o] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.folio, folio));
    if (!o) throw new HttpError(404, 'Pedido no encontrado');
    const set: Partial<typeof orders.$inferInsert> = {};
    if (input.estado) set.estado = input.estado;
    if (input.estadoPago) set.estadoPago = input.estadoPago;
    if (Object.keys(set).length) await tx.update(orders).set(set).where(eq(orders.id, o.id));
    if (input.refCode !== undefined) await linkLead(tx, o.id, input.refCode);
  });
  res.json(await loadDetail(folio));
});

// --- Venta manual (cerrada por WhatsApp) ---

const manualBody = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(2).max(120),
    whatsapp: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .pipe(z.string().regex(/^(52(1)?)?\d{10}$/, 'WhatsApp de 10 dígitos')),
    correo: z.email().max(200).or(z.literal('')).optional(),
    giro: z.enum(values(GIROS)).or(z.literal('')).optional(),
  }),
  items: z
    .array(
      z.object({
        tipo: z.enum(['producto', 'paquete']),
        id: z.number().int().positive(),
        detalle: z.string().trim().max(300).default(''),
        cantidad: z.number().int().positive().max(1_000_000),
        total: z.number().int().min(0).max(100_000_000),
      }),
    )
    .min(1)
    .max(30),
  envio: z.number().int().min(0).max(10_000_000).default(0),
  metodoPago: z.enum(values(PAYMENT_METHODS)),
  entrega: z.enum(values(DELIVERY_METHODS)),
  estadoPago: z.enum(PAYMENT_STATES),
  refCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || REF_CODE_PATTERN.test(v), 'Código con formato XX-XXXX')
    .optional(),
  comoNosConocio: z.enum(values(ORIGENES)).or(z.literal('')).optional(),
});

adminOrdersRouter.post('/orders/manual', async (req, res) => {
  const r = manualBody.safeParse(req.body);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new HttpError(
      400,
      issue ? `${issue.path.join('.')}: ${issue.message}` : 'Datos inválidos',
    );
  }
  const input = r.data;

  const productIds = input.items.filter((i) => i.tipo === 'producto').map((i) => i.id);
  const packageIds = input.items.filter((i) => i.tipo === 'paquete').map((i) => i.id);
  const [prods, pkgs] = await Promise.all([
    productIds.length
      ? db
          .select({ id: products.id, nombre: products.nombre })
          .from(products)
          .where(inArray(products.id, productIds))
      : [],
    packageIds.length
      ? db
          .select({ id: packages.id, nombre: packages.nombre })
          .from(packages)
          .where(inArray(packages.id, packageIds))
      : [],
  ]);
  const name = (tipo: string, itemId: number) => {
    if (tipo === 'producto') return prods.find((p) => p.id === itemId)?.nombre;
    const pkg = pkgs.find((p) => p.id === itemId);
    return pkg ? `Paquete ${pkg.nombre}` : undefined;
  };

  const subtotal = input.items.reduce((s, i) => s + i.total, 0);
  const { folio } = await db.transaction(async (tx) => {
    const customerId = await upsertCustomer(tx, {
      nombre: input.cliente.nombre,
      whatsapp: input.cliente.whatsapp,
      correo: input.cliente.correo,
      giro: input.cliente.giro,
      origen: input.comoNosConocio,
    });
    const created = await insertOrder(
      tx,
      {
        customerId,
        subtotal,
        envio: input.envio,
        total: subtotal + input.envio,
        metodoPago: input.metodoPago,
        entrega: input.entrega,
        estadoPago: input.estadoPago,
        comoNosConocio: input.comoNosConocio || null,
        manual: true,
        packageUpgrade: false,
      },
      input.items.map((i) => {
        const nombre = name(i.tipo, i.id);
        if (!nombre) throw new HttpError(400, `No existe el ${i.tipo} ${i.id}.`);
        return {
          tipo: i.tipo,
          productId: i.tipo === 'producto' ? i.id : null,
          packageId: i.tipo === 'paquete' ? i.id : null,
          opciones: { nombre, detalle: i.detalle ? [i.detalle] : [] },
          cantidad: i.cantidad,
          precioUnitario: Math.round(i.total / i.cantidad),
          total: i.total,
        };
      }),
    );
    if (input.refCode) await linkLead(tx, created.id, input.refCode);
    return created;
  });

  const body: OrderCreatedDTO = { folio, pagoUrl: null };
  res.status(201).json(body);
});

// --- Leads de WhatsApp ---

adminOrdersRouter.get('/leads', async (req, res) => {
  const q = z.string().trim().max(40).optional().catch(undefined).parse(req.query.q);
  const rows = await db
    .select({
      id: leads.id,
      refCode: leads.refCode,
      producto: products.nombre,
      createdAt: leads.createdAt,
      canal: leads.canal,
      utmSource: leads.utmSource,
      folio: orders.folio,
    })
    .from(leads)
    .leftJoin(products, eq(products.id, leads.productId))
    .leftJoin(orders, eq(orders.id, leads.convertidoAOrderId))
    .where(q ? ilike(leads.refCode, `%${escapeLike(q)}%`) : undefined)
    .orderBy(desc(leads.createdAt))
    .limit(200);
  res.json(
    rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) satisfies AdminLeadRow[],
  );
});
