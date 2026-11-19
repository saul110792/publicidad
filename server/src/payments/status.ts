import type { PaymentState } from './types';

/** Estados de Mercado Pago → estado interno. */
export function mapMercadoPagoStatus(status: string): PaymentState {
  switch (status) {
    case 'approved':
      return 'pagado';
    case 'rejected':
    case 'cancelled':
      return 'fallido';
    case 'refunded':
    case 'charged_back':
      return 'reembolsado';
    default:
      // pending, in_process, authorized, in_mediation…
      return 'pendiente';
  }
}

/**
 * Estado de pago del pedido a partir de todos sus intentos.
 *  - Un pago aprobado por el monto completo deja el pedido "pagado".
 *  - Un aprobado por menos del total no cuenta (se revisa a mano).
 *  - Si el pago que lo dejó pagado se reembolsa, queda "reembolsado".
 *  - Un rechazo no borra un pago aprobado anterior (los webhooks llegan desordenados).
 */
export function orderPaymentState(
  intentos: { estado: PaymentState; monto: number }[],
  total: number | null,
): PaymentState {
  const completo = (m: number) => total != null && m >= total;
  if (intentos.some((p) => p.estado === 'pagado' && completo(p.monto))) return 'pagado';
  if (intentos.some((p) => p.estado === 'reembolsado' && completo(p.monto))) return 'reembolsado';
  if (intentos.some((p) => p.estado === 'pendiente')) return 'pendiente';
  if (intentos.length && intentos.every((p) => p.estado === 'fallido')) return 'fallido';
  return 'pendiente';
}
