import { Router } from 'express';
import { z } from 'zod';
import type { PaymentStartDTO, PaymentStatusDTO } from '@publicidad/shared';
import { db } from '../db/client';
import { orders } from '../db/schema';
import { HttpError } from '../middleware/errors';
import { paymentProvider } from '../payments';
import { MockPaymentProvider } from '../payments/mock';
import { InvalidSignatureError } from '../payments/types';
import { FOLIO_PATTERN } from '../services/folio';
import { applyPayment, confirmPayment, startCheckout } from '../services/payments';
import { parse } from '../services/validation';
import { eq } from 'drizzle-orm';

export const paymentsRouter = Router();

const folioSchema = z.string().regex(FOLIO_PATTERN);

/** (Re)intenta el pago en línea de un pedido pendiente. */
paymentsRouter.post('/orders/:folio/pago', async (req, res) => {
  const folio = parse(folioSchema, req.params.folio);
  const body: PaymentStartDTO = { redirectUrl: await startCheckout(folio) };
  res.json(body);
});

/**
 * Al regresar del checkout el navegador manda el id del pago; el back lo consulta al
 * proveedor. Sirve también cuando el webhook no llega (por ejemplo, en local).
 */
paymentsRouter.post('/orders/:folio/pago/confirmar', async (req, res) => {
  const folio = parse(folioSchema, req.params.folio);
  const { paymentId } = parse(z.object({ paymentId: z.string().regex(/^[\w-]{1,40}$/) }), req.body);
  const estadoPago = await confirmPayment(folio, paymentId);
  if (!estadoPago) throw new HttpError(404, 'Pedido no encontrado');
  const body: PaymentStatusDTO = { estadoPago };
  res.json(body);
});

/** Webhook del proveedor. Responde 200 rápido para que no reintente de más. */
paymentsRouter.post('/payments/webhook/:provider', async (req, res) => {
  if (!paymentProvider || req.params.provider !== paymentProvider.name) {
    throw new HttpError(404, 'No encontrado');
  }
  let paymentId: string | null;
  try {
    paymentId = paymentProvider.parseWebhook({
      headers: req.headers,
      query: req.query as Record<string, unknown>,
      body: req.body,
    });
  } catch (err) {
    if (err instanceof InvalidSignatureError) throw new HttpError(401, 'Firma inválida');
    throw err;
  }
  if (paymentId) {
    const payment = await paymentProvider.getPayment(paymentId);
    await applyPayment(paymentProvider, payment);
  }
  res.json({ ok: true });
});

/** Solo con PAYMENT_PROVIDER=mock (nunca en producción): aprueba o rechaza un pago simulado. */
paymentsRouter.post('/pago-de-prueba/:folio', async (req, res) => {
  if (!(paymentProvider instanceof MockPaymentProvider)) throw new HttpError(404, 'No encontrado');
  const folio = parse(folioSchema, req.params.folio);
  const { aprobar } = parse(z.object({ aprobar: z.boolean() }), req.body);
  const [order] = await db.select().from(orders).where(eq(orders.folio, folio)).limit(1);
  if (!order || order.total == null) throw new HttpError(404, 'Pedido no encontrado');

  const payment = paymentProvider.simulate(folio, order.total, aprobar ? 'pagado' : 'fallido');
  const estadoPago = await applyPayment(paymentProvider, payment);
  const body: PaymentStatusDTO & { paymentId: string } = {
    estadoPago: estadoPago ?? 'pendiente',
    paymentId: payment.id,
  };
  res.json(body);
});
