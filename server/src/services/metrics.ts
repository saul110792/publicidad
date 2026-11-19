/**
 * Métricas del dashboard. Ventas desde `orders`; embudo y ofertas desde `events` (lo que
 * manda track() del front). Todo dentro del rango [desde, hasta).
 */
import { and, gte, lt, sql } from 'drizzle-orm';
import type { MetricsDTO } from '@publicidad/shared';
import { db } from '../db/client';
import { events, leads, orders } from '../db/schema';

/** Pasos del embudo: sesiones únicas que hicieron alguno de esos eventos. */
export const FUNNEL = [
  { paso: 'Vieron un producto', eventos: ['view_item'] },
  { paso: 'Cotizaron', eventos: ['quote_updated', 'click_whatsapp'] },
  { paso: 'Agregaron al carrito', eventos: ['add_to_cart'] },
  { paso: 'Iniciaron checkout', eventos: ['begin_checkout'] },
  { paso: 'Compraron', eventos: ['purchase'] },
] as const;

const canal = sql<string>`coalesce(
  ${orders.utmSource},
  case when ${orders.refCode} is not null or ${orders.manual} then 'whatsapp' else 'directo' end
)`;

const toNum = (v: unknown) => Number(v ?? 0);

export async function getMetrics(desde: Date, hasta: Date): Promise<MetricsDTO> {
  const inOrders = and(gte(orders.createdAt, desde), lt(orders.createdAt, hasta));
  const inEvents = and(gte(events.createdAt, desde), lt(events.createdAt, hasta));

  const [ventas] = await db
    .select({
      pedidos: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)::bigint`,
      conTotal: sql<number>`count(${orders.total})::int`,
    })
    .from(orders)
    .where(inOrders);

  const porCanal = await db
    .select({
      canal,
      pedidos: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)::bigint`,
    })
    .from(orders)
    .where(inOrders)
    .groupBy(canal)
    .orderBy(sql`count(*) desc`);

  const origen = sql<string>`coalesce(${orders.comoNosConocio}, 'sin_dato')`;
  const porComoNosConocio = await db
    .select({
      origen,
      pedidos: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)::bigint`,
    })
    .from(orders)
    .where(inOrders)
    .groupBy(origen)
    .orderBy(sql`count(*) desc`);

  const funnelRows = await db
    .select({
      nombre: events.nombre,
      sesiones: sql<string[]>`array_agg(distinct ${events.sessionId})`,
    })
    .from(events)
    .where(inEvents)
    .groupBy(events.nombre);
  const sessionsBy = new Map(funnelRows.map((r) => [r.nombre, r.sesiones ?? []]));
  const embudo = FUNNEL.map((step) => {
    const set = new Set<string>();
    for (const ev of step.eventos) for (const s of sessionsBy.get(ev) ?? []) if (s) set.add(s);
    return { paso: step.paso, evento: step.eventos.join(' / '), sesiones: set.size };
  });

  const [ofertas] = await db
    .select({
      mostradas: sql<number>`count(distinct (${events.sessionId}, ${events.payload}->>'package'))
        filter (where ${events.nombre} = 'package_offer_shown')::int`,
      aceptadas: sql<number>`count(*) filter (where ${events.nombre} = 'package_upgrade')::int`,
    })
    .from(events)
    .where(inEvents);

  const [upgrades] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(inOrders, sql`${orders.packageUpgrade}`));

  // Clientes con una compra suelta (sin paquete) y, después, una compra con paquete en el rango.
  const sueltos = await db.execute<{ suelto_a_paquete: number; con_suelta: number }>(sql`
    with pedido as (
      select o.id, o.customer_id, o.created_at,
        exists (select 1 from order_items i where i.order_id = o.id and i.tipo = 'paquete') as con_paquete
      from orders o
    )
    select
      (select count(distinct p2.customer_id)::int
         from pedido p2
         where p2.con_paquete
           and p2.created_at >= ${desde} and p2.created_at < ${hasta}
           and exists (select 1 from pedido p1
                        where p1.customer_id = p2.customer_id
                          and not p1.con_paquete and p1.created_at < p2.created_at)
      ) as suelto_a_paquete,
      (select count(distinct customer_id)::int from pedido where not con_paquete) as con_suelta
  `);
  const s0 = sueltos.rows[0];

  const entrada = await db.execute<{ producto: string; upgrades: number }>(sql`
    select coalesce(p.nombre, x.slug) as producto, count(*)::int as upgrades
    from ${events} e
    cross join lateral jsonb_array_elements_text(coalesce(e.payload->'productos', '[]'::jsonb)) as x(slug)
    left join products p on p.slug = x.slug
    where e.nombre = 'package_upgrade' and e.created_at >= ${desde} and e.created_at < ${hasta}
    group by 1
    order by 2 desc
    limit 10
  `);

  const [lead] = await db
    .select({
      total: sql<number>`count(*)::int`,
      convertidos: sql<number>`count(${leads.convertidoAOrderId})::int`,
    })
    .from(leads)
    .where(and(gte(leads.createdAt, desde), lt(leads.createdAt, hasta)));

  const total = toNum(ventas?.total);
  const conTotal = toNum(ventas?.conTotal);
  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    ventas: {
      pedidos: toNum(ventas?.pedidos),
      total,
      ticketPromedio: conTotal ? Math.round(total / conTotal) : null,
      porConfirmar: toNum(ventas?.pedidos) - conTotal,
    },
    porCanal: porCanal.map((r) => ({ ...r, total: toNum(r.total) })),
    porComoNosConocio: porComoNosConocio.map((r) => ({ ...r, total: toNum(r.total) })),
    embudo,
    paquetes: {
      ofertasMostradas: toNum(ofertas?.mostradas),
      ofertasAceptadas: toNum(ofertas?.aceptadas),
      pedidosConUpgrade: toNum(upgrades?.n),
      sueltoAPaquete: toNum(s0?.suelto_a_paquete),
      clientesConCompraSuelta: toNum(s0?.con_suelta),
    },
    productosDeEntrada: entrada.rows.map((r) => ({
      producto: r.producto,
      upgrades: toNum(r.upgrades),
    })),
    leads: { total: toNum(lead?.total), convertidos: toNum(lead?.convertidos) },
  };
}
