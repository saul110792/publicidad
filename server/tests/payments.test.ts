import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MercadoPagoProvider, verifyMercadoPagoSignature } from '../src/payments/mercadopago';
import { mapMercadoPagoStatus, orderPaymentState } from '../src/payments/status';
import { InvalidSignatureError } from '../src/payments/types';

const SECRET = 'clave-secreta';

function sign(manifest: string, secret = SECRET) {
  return createHmac('sha256', secret).update(manifest).digest('hex');
}

describe('mapMercadoPagoStatus', () => {
  it('traduce los estados de Mercado Pago', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('pagado');
    expect(mapMercadoPagoStatus('rejected')).toBe('fallido');
    expect(mapMercadoPagoStatus('cancelled')).toBe('fallido');
    expect(mapMercadoPagoStatus('refunded')).toBe('reembolsado');
    expect(mapMercadoPagoStatus('charged_back')).toBe('reembolsado');
    expect(mapMercadoPagoStatus('in_process')).toBe('pendiente');
    expect(mapMercadoPagoStatus('pending')).toBe('pendiente');
  });
});

describe('orderPaymentState', () => {
  const total = 100000;

  it('sin intentos queda pendiente', () => {
    expect(orderPaymentState([], total)).toBe('pendiente');
  });

  it('un aprobado por el total deja el pedido pagado', () => {
    expect(orderPaymentState([{ estado: 'pagado', monto: total }], total)).toBe('pagado');
  });

  it('un aprobado por menos del total no lo da por pagado', () => {
    expect(orderPaymentState([{ estado: 'pagado', monto: total - 1 }], total)).toBe('pendiente');
  });

  it('un rechazo posterior no borra un pago aprobado (webhooks desordenados)', () => {
    expect(
      orderPaymentState(
        [
          { estado: 'pagado', monto: total },
          { estado: 'fallido', monto: total },
        ],
        total,
      ),
    ).toBe('pagado');
  });

  it('solo rechazos: fallido; un reintento pendiente vuelve a pendiente', () => {
    expect(orderPaymentState([{ estado: 'fallido', monto: total }], total)).toBe('fallido');
    expect(
      orderPaymentState(
        [
          { estado: 'fallido', monto: total },
          { estado: 'pendiente', monto: total },
        ],
        total,
      ),
    ).toBe('pendiente');
  });

  it('si el pago se reembolsa, queda reembolsado', () => {
    expect(orderPaymentState([{ estado: 'reembolsado', monto: total }], total)).toBe('reembolsado');
  });

  it('sin total definido nunca queda pagado', () => {
    expect(orderPaymentState([{ estado: 'pagado', monto: total }], null)).toBe('pendiente');
  });
});

describe('verifyMercadoPagoSignature', () => {
  const ts = '1704908010';
  const manifest = `id:123456;request-id:req-1;ts:${ts};`;

  it('acepta una firma válida', () => {
    expect(
      verifyMercadoPagoSignature({
        signature: `ts=${ts},v1=${sign(manifest)}`,
        requestId: 'req-1',
        dataId: '123456',
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it('pasa a minúsculas los ids alfanuméricos', () => {
    const m = `id:abc123;request-id:req-1;ts:${ts};`;
    expect(
      verifyMercadoPagoSignature({
        signature: `ts=${ts}, v1=${sign(m)}`,
        requestId: 'req-1',
        dataId: 'ABC123',
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it('rechaza firma con otro secreto, otro id o sin header', () => {
    const base = { requestId: 'req-1', dataId: '123456', secret: SECRET };
    expect(
      verifyMercadoPagoSignature({ ...base, signature: `ts=${ts},v1=${sign(manifest, 'otro')}` }),
    ).toBe(false);
    expect(
      verifyMercadoPagoSignature({
        ...base,
        dataId: '999',
        signature: `ts=${ts},v1=${sign(manifest)}`,
      }),
    ).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signature: undefined })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signature: 'basura' })).toBe(false);
  });
});

describe('MercadoPagoProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('parseWebhook: ignora lo que no es pago y valida la firma', () => {
    const mp = new MercadoPagoProvider('TOKEN', SECRET);
    expect(
      mp.parseWebhook({ headers: {}, query: { type: 'merchant_order' }, body: {} }),
    ).toBeNull();

    const ts = '1700000000';
    const sig = sign(`id:42;request-id:r1;ts:${ts};`);
    expect(
      mp.parseWebhook({
        headers: { 'x-signature': `ts=${ts},v1=${sig}`, 'x-request-id': 'r1' },
        query: { type: 'payment', 'data.id': '42' },
        body: { type: 'payment', data: { id: '42' } },
      }),
    ).toBe('42');

    expect(() =>
      mp.parseWebhook({
        headers: { 'x-signature': `ts=${ts},v1=${sig}`, 'x-request-id': 'r1' },
        query: { type: 'payment', 'data.id': '43' },
        body: {},
      }),
    ).toThrow(InvalidSignatureError);
  });

  it('createCheckout manda el total en pesos, el folio y las URLs de regreso', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: 'pref-1', init_point: 'https://mp.example/checkout' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mp = new MercadoPagoProvider('TOKEN', undefined);

    const out = await mp.createCheckout({
      folio: 'P-ABCDEF',
      descripcion: 'Pedido P-ABCDEF',
      total: 115050,
      payer: { nombre: 'Ana', correo: null, whatsapp: '5215512345678' },
      backUrls: {
        aprobado: 'http://localhost:5173/pedido/P-ABCDEF?pago=aprobado',
        rechazado: 'http://localhost:5173/pedido/P-ABCDEF?pago=rechazado',
        pendiente: 'http://localhost:5173/pedido/P-ABCDEF?pago=pendiente',
      },
      notificationUrl: null,
    });

    expect(out).toEqual({ id: 'pref-1', redirectUrl: 'https://mp.example/checkout' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer TOKEN');
    const body = JSON.parse(init.body as string);
    expect(body.items[0]).toMatchObject({ unit_price: 1150.5, currency_id: 'MXN', quantity: 1 });
    expect(body.external_reference).toBe('P-ABCDEF');
    expect(body.payer).toEqual({ name: 'Ana', phone: { area_code: '52', number: '5512345678' } });
    expect(body.auto_return).toBeUndefined(); // localhost: sin auto_return
    expect(body.notification_url).toBeUndefined();
  });

  it('getPayment convierte el monto a centavos y el estado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          id: 987,
          status: 'approved',
          external_reference: 'P-ABCDEF',
          transaction_amount: 1150.5,
        }),
      ),
    );
    const p = await new MercadoPagoProvider('TOKEN', undefined).getPayment('987');
    expect(p).toMatchObject({ id: '987', estado: 'pagado', folio: 'P-ABCDEF', monto: 115050 });
  });

  it('getPayment rechaza ids que no son numéricos', async () => {
    await expect(new MercadoPagoProvider('T', undefined).getPayment('../x')).rejects.toThrow();
  });
});
