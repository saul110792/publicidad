import { clientUrl, env } from '../config/env';
import { MercadoPagoProvider } from './mercadopago';
import { MockPaymentProvider } from './mock';
import type { PaymentProvider } from './types';

function pick(): PaymentProvider | null {
  const name = env.PAYMENT_PROVIDER ?? (env.MP_ACCESS_TOKEN ? 'mercadopago' : undefined);
  if (name === 'mercadopago') {
    if (!env.MP_ACCESS_TOKEN) {
      console.warn('PAYMENT_PROVIDER=mercadopago sin MP_ACCESS_TOKEN: pago en línea desactivado.');
      return null;
    }
    if (!env.MP_WEBHOOK_SECRET && env.NODE_ENV === 'production') {
      console.warn('Falta MP_WEBHOOK_SECRET: los webhooks no se validan con firma.');
    }
    return new MercadoPagoProvider(env.MP_ACCESS_TOKEN, env.MP_WEBHOOK_SECRET);
  }
  if (name === 'mock') {
    if (env.NODE_ENV === 'production') {
      console.warn('PAYMENT_PROVIDER=mock se ignora en producción.');
      return null;
    }
    return new MockPaymentProvider(clientUrl);
  }
  return null;
}

/** Proveedor activo, o NULL si el pago en línea no está configurado. */
export const paymentProvider: PaymentProvider | null = pick();

export type { PaymentProvider } from './types';
