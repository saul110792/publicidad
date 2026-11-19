/**
 * Interfaz común de pagos. El resto del back solo habla con esto, así que cambiar
 * Mercado Pago por Stripe (u otro) es escribir un archivo nuevo que la implemente.
 */
import type { Centavos, PaymentState } from '@publicidad/shared';

export type { PaymentState };

export type CheckoutInput = {
  folio: string;
  descripcion: string;
  total: Centavos;
  payer: { nombre: string; correo: string | null; whatsapp: string };
  /** URLs del front a las que regresa el cliente. */
  backUrls: { aprobado: string; rechazado: string; pendiente: string };
  /** URL pública para webhooks; si no hay, el pago se confirma al regresar el cliente. */
  notificationUrl: string | null;
};

export type ProviderPayment = {
  id: string;
  estado: PaymentState;
  estadoProveedor: string;
  /** Folio del pedido (external_reference). */
  folio: string | null;
  monto: Centavos;
  raw: unknown;
};

export type WebhookRequest = {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, unknown>;
  body: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  /** Crea el checkout y devuelve a dónde mandar al cliente. */
  createCheckout(input: CheckoutInput): Promise<{ id: string; redirectUrl: string }>;
  /** Consulta el pago al proveedor: nunca se confía en lo que diga el navegador. */
  getPayment(id: string): Promise<ProviderPayment>;
  /**
   * Valida la firma del webhook y devuelve el id del pago a consultar.
   * NULL = notificación que no es de un pago (se ignora). Lanza si la firma no es válida.
   */
  parseWebhook(req: WebhookRequest): string | null;
}

export class InvalidSignatureError extends Error {}
