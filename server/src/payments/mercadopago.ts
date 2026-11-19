/**
 * Mercado Pago Checkout Pro. Se usa la API REST directamente (sin SDK).
 * Docs: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mapMercadoPagoStatus } from './status';
import {
  InvalidSignatureError,
  type CheckoutInput,
  type PaymentProvider,
  type ProviderPayment,
  type WebhookRequest,
} from './types';

const API = 'https://api.mercadopago.com';

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null);

/**
 * Valida el header `x-signature` (ts=…,v1=…) con la clave secreta del panel.
 * Plantilla: `id:{data.id};request-id:{x-request-id};ts:{ts};` (se omiten las partes vacías).
 */
export function verifyMercadoPagoSignature(opts: {
  signature: string | undefined;
  requestId: string | undefined;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!opts.signature) return false;
  const parts: Record<string, string> = {};
  for (const p of opts.signature.split(',')) {
    const [k, v] = p.trim().split('=', 2);
    if (k && v) parts[k] = v;
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const id =
    opts.dataId && /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', opts.secret).update(manifest).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercadopago';

  constructor(
    private accessToken: string,
    private webhookSecret: string | undefined,
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
    if (!res.ok || !body) {
      throw new Error(`Mercado Pago ${res.status}: ${body?.message ?? 'error'}`);
    }
    return body;
  }

  async createCheckout(input: CheckoutInput) {
    const https = input.backUrls.aprobado.startsWith('https://');
    const pref = await this.request<{ id: string; init_point: string }>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          {
            id: input.folio,
            title: input.descripcion,
            quantity: 1,
            unit_price: input.total / 100,
            currency_id: 'MXN',
          },
        ],
        payer: {
          name: input.payer.nombre,
          ...(input.payer.correo ? { email: input.payer.correo } : {}),
          phone: { area_code: '52', number: input.payer.whatsapp.slice(-10) },
        },
        external_reference: input.folio,
        metadata: { folio: input.folio },
        back_urls: {
          success: input.backUrls.aprobado,
          failure: input.backUrls.rechazado,
          pending: input.backUrls.pendiente,
        },
        // Mercado Pago solo acepta auto_return con URLs https (no en localhost).
        ...(https ? { auto_return: 'approved' } : {}),
        ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
        // Pago con tarjeta: sin efectivo en tiendas (ticket) ni cajeros (atm).
        payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
      }),
    });
    return { id: pref.id, redirectUrl: pref.init_point };
  }

  async getPayment(id: string): Promise<ProviderPayment> {
    if (!/^\d{1,30}$/.test(id)) throw new Error('Id de pago inválido');
    const p = await this.request<{
      id: number;
      status: string;
      external_reference: string | null;
      transaction_amount: number;
    }>(`/v1/payments/${id}`);
    return {
      id: String(p.id),
      estado: mapMercadoPagoStatus(p.status),
      estadoProveedor: p.status,
      folio: p.external_reference,
      monto: Math.round(p.transaction_amount * 100),
      raw: p,
    };
  }

  parseWebhook(req: WebhookRequest): string | null {
    const body = (req.body ?? {}) as { type?: string; data?: { id?: unknown } };
    const type = str(first(req.query.type)) ?? body.type ?? str(first(req.query.topic));
    if (type !== 'payment') return null;

    const queryId = str(first(req.query['data.id']));
    const dataId = queryId ?? str(body.data?.id) ?? str(first(req.query.id));
    if (!dataId) return null;

    if (this.webhookSecret) {
      const ok = verifyMercadoPagoSignature({
        signature: str(first(req.headers['x-signature'])) ?? undefined,
        requestId: str(first(req.headers['x-request-id'])) ?? undefined,
        dataId,
        secret: this.webhookSecret,
      });
      if (!ok) throw new InvalidSignatureError('Firma inválida');
    }
    return dataId;
  }
}
