/**
 * Pagos de pedidos. Toda confirmación pasa por `applyPayment`, que consulta al proveedor
 * (nunca confía en el navegador), guarda el intento y recalcula el estado del pedido.
 */
import { and, eq, sql } from 'drizzle-orm';
import { clientUrl, env } from '../config/env';
import { db } from '../db/client';
import { customers, orders, payments } from '../db/schema';
import { HttpError } from '../middleware/errors';
import { paymentProvider } from '../payments';
import { orderPaymentState } from '../payments/status';
import type { PaymentProvider, ProviderPayment } from '../payments/types';

type OrderRow = typeof orders.$inferSelect;

/** El pedido se puede pagar en línea: tarjeta, con total definido y sin pagar todavía. */
export function canPayOnline(o: Pick<OrderRow, 'metodoPago' | 'total' | 'estadoPago'>) {
  return (
    paymentProvider != null &&
    o.metodoPago === 'tarjeta' &&
    o.total != null &&
    o.total > 0 &&
    (o.estadoPago === 'pendiente' || o.estadoPago === 'fallido')
  );
}

async function loadOrder(folio: string) {
  const [row] = await db
    .select({ order: orders, customer: customers })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.folio, folio))
    .limit(1);
  return row ?? null;
}

/** Crea el checkout del proveedor y devuelve la URL a la que se manda al cliente. */
export async function startCheckout(folio: string): Promise<string> {
  const row = await loadOrder(folio);
  if (!row) throw new HttpError(404, 'Pedido no encontrado');
  const { order, customer } = row;
  if (!paymentProvider) throw new HttpError(503, 'El pago en línea no está disponible.');
  if (!canPayOnline(order)) throw new HttpError(409, 'Este pedido no se puede pagar en línea.');

  const back = (estado: string) => `${clientUrl}/pedido/${folio}?pago=${estado}`;
  const api = env.API_PUBLIC_URL?.replace(/\/$/, '');
  const { redirectUrl } = await paymentProvider.createCheckout({
    folio,
    descripcion: `Pedido ${folio}`,
    total: order.total!,
    payer: { nombre: customer.nombre, correo: customer.correo, whatsapp: customer.whatsapp },
    backUrls: {
      aprobado: back('aprobado'),
      rechazado: back('rechazado'),
      pendiente: back('pendiente'),
    },
    notificationUrl: api?.startsWith('https://')
      ? `${api}/api/payments/webhook/${paymentProvider.name}`
      : null,
  });
  return redirectUrl;
}

/**
 * Guarda el intento de pago (idempotente por proveedor + id) y recalcula el estado del pedido.
 * Devuelve el estado resultante, o NULL si el pago no corresponde a ningún pedido.
 */
export async function applyPayment(provider: PaymentProvider, payment: ProviderPayment) {
  if (!payment.folio) return null;
  return db.transaction(async (tx) => {
    // Bloquea el pedido para que dos webhooks simultáneos no se pisen.
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.folio, payment.folio!))
      .for('update')
      .limit(1);
    if (!order) return null;

    await tx
      .insert(payments)
      .values({
        orderId: order.id,
        provider: provider.name,
        providerRef: payment.id,
        estado: payment.estado,
        estadoProveedor: payment.estadoProveedor,
        monto: payment.monto,
        raw: payment.raw as object,
      })
      .onConflictDoUpdate({
        target: [payments.provider, payments.providerRef],
        set: {
          estado: payment.estado,
          estadoProveedor: payment.estadoProveedor,
          monto: payment.monto,
          raw: payment.raw as object,
          updatedAt: sql`now()`,
        },
      });

    const intentos = await tx
      .select({ id: payments.providerRef, estado: payments.estado, monto: payments.monto })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.provider, provider.name)));

    const estadoPago = orderPaymentState(intentos, order.total);
    const pagado = intentos.find(
      (p) => p.estado === 'pagado' && order.total != null && p.monto >= order.total,
    );
    if (
      intentos.some((p) => p.estado === 'pagado' && order.total != null && p.monto < order.total)
    ) {
      console.warn(`Pago menor al total en ${order.folio}: revisar a mano.`);
    }

    await tx
      .update(orders)
      .set({ estadoPago, pagoRef: pagado?.id ?? order.pagoRef })
      .where(eq(orders.id, order.id));
    return estadoPago;
  });
}

/** Consulta un pago al proveedor y lo aplica, validando que sea de ese pedido. */
export async function confirmPayment(folio: string, paymentId: string) {
  if (!paymentProvider) throw new HttpError(503, 'El pago en línea no está disponible.');
  let payment: ProviderPayment;
  try {
    payment = await paymentProvider.getPayment(paymentId);
  } catch {
    throw new HttpError(404, 'No encontramos ese pago.');
  }
  if (payment.folio !== folio) throw new HttpError(404, 'No encontramos ese pago.');
  return applyPayment(paymentProvider, payment);
}
