/**
 * Pago simulado para desarrollo: manda al cliente a /pago-de-prueba/:folio, donde elige
 * aprobar o rechazar. Nunca se activa en producción (ver payments/index.ts).
 */
import { randomBytes } from 'node:crypto';
import type { CheckoutInput, PaymentProvider, PaymentState, ProviderPayment } from './types';

const store = new Map<string, ProviderPayment>();

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  constructor(private clientUrl: string) {}

  async createCheckout(input: CheckoutInput) {
    const id = `mock-${randomBytes(4).toString('hex')}`;
    return { id, redirectUrl: `${this.clientUrl}/pago-de-prueba/${input.folio}` };
  }

  /** Lo usa la página de prueba: registra un pago simulado por el monto indicado. */
  simulate(folio: string, monto: number, estado: PaymentState): ProviderPayment {
    const payment: ProviderPayment = {
      id: `mock-${randomBytes(6).toString('hex')}`,
      estado,
      estadoProveedor: estado === 'pagado' ? 'approved' : 'rejected',
      folio,
      monto,
      raw: { simulado: true },
    };
    store.set(payment.id, payment);
    return payment;
  }

  async getPayment(id: string): Promise<ProviderPayment> {
    const p = store.get(id);
    if (!p) throw new Error('Pago simulado no encontrado');
    return p;
  }

  parseWebhook(): string | null {
    return null;
  }
}
