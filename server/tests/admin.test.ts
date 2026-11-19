import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  clearLoginFailures,
  createSessionToken,
  getCookie,
  hashPassword,
  loginLocked,
  readSessionToken,
  registerLoginFailure,
  SESSION_TTL_MS,
  verifyPassword,
} from '../src/services/auth';
import { parseRange } from '../src/routes/admin/metrics';
import { csvCell } from '../src/services/remarketing';

const SECRET = 'x'.repeat(40);

describe('contraseñas', () => {
  it('verifica la correcta y rechaza otra', async () => {
    const hash = await hashPassword('una-clave-larga');
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword('una-clave-larga', hash)).toBe(true);
    expect(await verifyPassword('otra-clave', hash)).toBe(false);
  });

  it('dos hashes de la misma clave son distintos (sal aleatoria)', async () => {
    expect(await hashPassword('igual-igual')).not.toBe(await hashPassword('igual-igual'));
  });

  it('rechaza formatos desconocidos', async () => {
    expect(await verifyPassword('x', 'md5$abc')).toBe(false);
  });
});

describe('token de sesión', () => {
  const now = 1_700_000_000_000;

  it('lee el id de un token válido', () => {
    expect(readSessionToken(createSessionToken(7, now, SECRET), now, SECRET)).toBe(7);
  });

  it('rechaza tokens vencidos, alterados o con otro secreto', () => {
    const t = createSessionToken(7, now, SECRET);
    expect(readSessionToken(t, now + SESSION_TTL_MS + 1, SECRET)).toBeNull();
    expect(readSessionToken(t.replace(/^7\./, '8.'), now, SECRET)).toBeNull();
    expect(readSessionToken(t, now, 'y'.repeat(40))).toBeNull();
    expect(readSessionToken('basura', now, SECRET)).toBeNull();
    expect(readSessionToken(undefined, now, SECRET)).toBeNull();
  });
});

describe('getCookie', () => {
  it('lee la cookie pedida entre varias', () => {
    expect(getCookie('a=1; admin_session=abc.def; b=2', 'admin_session')).toBe('abc.def');
    expect(getCookie('a=1', 'admin_session')).toBeUndefined();
    expect(getCookie(undefined, 'x')).toBeUndefined();
  });
});

describe('bloqueo por intentos', () => {
  it('bloquea tras 5 fallos y se limpia al entrar bien', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 4; i++) registerLoginFailure(key);
    expect(loginLocked(key)).toBe(false);
    registerLoginFailure(key);
    expect(loginLocked(key)).toBe(true);
    clearLoginFailures(key);
    expect(loginLocked(key)).toBe(false);
  });
});

describe('parseRange', () => {
  const now = new Date('2026-11-18T12:00:00Z');

  it('por defecto: últimos 30 días', () => {
    const { desde, hasta } = parseRange({}, now);
    expect(hasta).toEqual(now);
    expect((hasta.getTime() - desde.getTime()) / 86_400_000).toBe(30);
  });

  it('hasta es inclusivo', () => {
    const { desde, hasta } = parseRange({ desde: '2026-11-01', hasta: '2026-11-01' }, now);
    expect(desde.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(hasta.toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('rechaza rangos invertidos o de más de un año', () => {
    expect(() => parseRange({ desde: '2026-11-10', hasta: '2026-11-01' }, now)).toThrow();
    expect(() => parseRange({ desde: '2024-01-01', hasta: '2026-01-01' }, now)).toThrow();
  });
});

describe('csvCell', () => {
  it('escapa comillas y comas, y neutraliza fórmulas', () => {
    expect(csvCell('Ana, "la jefa"')).toBe('"Ana, ""la jefa"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell(null)).toBe('');
    expect(csvCell(42)).toBe('42');
  });
});

describe('rutas del admin', () => {
  const app = createApp();

  it('sin sesión responden 401', async () => {
    for (const path of [
      '/api/admin/me',
      '/api/admin/products',
      '/api/admin/orders',
      '/api/admin/metrics',
    ]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });

  it('un token falso no entra', async () => {
    const res = await request(app)
      .get('/api/admin/products')
      .set('Cookie', 'admin_session=1.9999999999999.firma-falsa');
    expect(res.status).toBe(401);
  });

  it('login con datos mal formados responde 400', async () => {
    const res = await request(app).post('/api/admin/login').send({ email: 'no-es-correo' });
    expect(res.status).toBe(400);
  });
});
