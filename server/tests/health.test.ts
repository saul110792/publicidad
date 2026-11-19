import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('API base', () => {
  it('responde /api/health', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('devuelve 404 en JSON para rutas desconocidas', async () => {
    const res = await request(createApp()).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No encontrado');
  });
});
