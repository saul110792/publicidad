import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('API base', () => {
  it('responde /api/health (503 si no hay base de datos)', async () => {
    const res = await request(createApp()).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.ok).toBe(res.status === 200);
  });

  it('limita los leads por IP (429 al pasar el tope)', async () => {
    const app = createApp();
    const statuses: number[] = [];
    // Cuerpo inválido: la ruta responde 400 sin tocar la BD, pero el intento cuenta.
    for (let i = 0; i < 21; i++) {
      statuses.push((await request(app).post('/api/leads').send({})).status);
    }
    expect(statuses.slice(0, 20).every((st) => st === 400)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it('devuelve 404 en JSON para rutas desconocidas', async () => {
    const res = await request(createApp()).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No encontrado');
  });
});
