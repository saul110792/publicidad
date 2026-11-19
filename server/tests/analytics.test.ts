import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { parseUtm, toMetaEvent, toPesos } from '@publicidad/shared';
import { createApp } from '../src/app';
import { parseEventBody } from '../src/routes/events';

describe('parseUtm', () => {
  it('lee las tres UTMs', () => {
    expect(parseUtm('?utm_source=facebook&utm_medium=cpc&utm_campaign=lonas+mayo')).toEqual({
      source: 'facebook',
      medium: 'cpc',
      campaign: 'lonas mayo',
    });
  });

  it('acepta el QR de los impresos', () => {
    expect(parseUtm('?utm_source=qr&utm_campaign=pedido-42')).toEqual({
      source: 'qr',
      medium: undefined,
      campaign: 'pedido-42',
    });
  });

  it('devuelve NULL sin UTMs o con UTMs vacías', () => {
    expect(parseUtm('')).toBeNull();
    expect(parseUtm('?q=lonas&cat=impresos')).toBeNull();
    expect(parseUtm('?utm_source=&utm_medium=%20')).toBeNull();
  });

  it('recorta valores largos e ignora codificación inválida', () => {
    expect(parseUtm(`?utm_source=${'a'.repeat(300)}`)?.source).toHaveLength(100);
    expect(parseUtm('?utm_source=%E0%A4%A&utm_medium=ok')).toEqual({
      source: undefined,
      medium: 'ok',
      campaign: undefined,
    });
  });
});

describe('toPesos', () => {
  it('convierte centavos y omite NULL', () => {
    expect(toPesos(115050)).toBe(1150.5);
    expect(toPesos(null)).toBeUndefined();
  });
});

describe('toMetaEvent', () => {
  it('usa eventos estándar de Meta cuando existen', () => {
    expect(toMetaEvent('page_view', {})).toEqual({ kind: 'track', name: 'PageView' });
    expect(toMetaEvent('view_item', {})).toEqual({ kind: 'track', name: 'ViewContent' });
    expect(toMetaEvent('add_to_cart', {})).toEqual({ kind: 'track', name: 'AddToCart' });
    expect(toMetaEvent('begin_checkout', {})).toEqual({ kind: 'track', name: 'InitiateCheckout' });
    expect(toMetaEvent('click_whatsapp', {})).toEqual({ kind: 'track', name: 'Contact' });
  });

  it('Purchase solo con valor; sin precio va como personalizado', () => {
    expect(toMetaEvent('purchase', { value: 1650 })).toEqual({ kind: 'track', name: 'Purchase' });
    expect(toMetaEvent('purchase', {})).toEqual({
      kind: 'trackCustom',
      name: 'PurchasePendingPrice',
    });
  });

  it('los eventos propios van como personalizados', () => {
    expect(toMetaEvent('package_upgrade', {})).toEqual({
      kind: 'trackCustom',
      name: 'package_upgrade',
    });
  });
});

describe('parseEventBody', () => {
  const ok = { nombre: 'add_to_cart', sessionId: 'abc12345-xyz', payload: { value: 10 } };

  it('acepta JSON o texto plano (sendBeacon)', () => {
    expect(parseEventBody(ok).nombre).toBe('add_to_cart');
    expect(parseEventBody(JSON.stringify(ok)).payload).toEqual({ value: 10 });
  });

  it('rechaza eventos fuera de la lista, sesiones raras y payloads enormes', () => {
    expect(() => parseEventBody({ ...ok, nombre: 'hackeo' })).toThrow();
    expect(() => parseEventBody({ ...ok, sessionId: '<script>' })).toThrow();
    expect(() => parseEventBody({ ...ok, payload: { x: 'a'.repeat(5000) } })).toThrow();
    expect(() => parseEventBody('no es json')).toThrow();
  });
});

describe('POST /api/events', () => {
  it('responde 400 con datos inválidos (sin tocar la BD)', async () => {
    const res = await request(createApp())
      .post('/api/events')
      .set('Content-Type', 'text/plain')
      .send('{"nombre":"nada"}');
    expect(res.status).toBe(400);
  });
});
