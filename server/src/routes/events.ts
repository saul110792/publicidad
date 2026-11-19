import express, { Router } from 'express';
import { z } from 'zod';
import { EVENT_NAMES } from '@publicidad/shared';
import { db } from '../db/client';
import { events } from '../db/schema';
import { HttpError } from '../middleware/errors';
import { utmSchema } from '../services/validation';

export const eventsRouter = Router();

const MAX_PAYLOAD = 4000;

export const eventSchema = z.object({
  nombre: z.enum(EVENT_NAMES),
  sessionId: z.string().regex(/^[\w-]{8,64}$/),
  payload: z
    .record(z.string().max(60), z.unknown())
    .refine((p) => JSON.stringify(p).length <= MAX_PAYLOAD)
    .default({}),
  utm: utmSchema,
});

/** Lee el cuerpo como JSON aunque llegue como text/plain (sendBeacon sin preflight de CORS). */
export function parseEventBody(body: unknown): z.infer<typeof eventSchema> {
  let data = body;
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body);
    } catch {
      throw new HttpError(400, 'Datos inválidos');
    }
  }
  const r = eventSchema.safeParse(data);
  if (!r.success) throw new HttpError(400, 'Datos inválidos');
  return r.data;
}

/**
 * Eventos propios del embudo (además de GA4/Pixel). Alimentan el dashboard del admin.
 * Responde 204 sin cuerpo: el navegador no espera nada.
 */
eventsRouter.post(
  '/events',
  express.text({ type: 'text/plain', limit: '8kb' }),
  async (req, res) => {
    const ev = parseEventBody(req.body);
    await db.insert(events).values({
      nombre: ev.nombre,
      sessionId: ev.sessionId,
      payload: ev.utm ? { ...ev.payload, utm: ev.utm } : ev.payload,
    });
    // sendBeacon pide en modo no-cors: sin esto, el CORP de helmet (same-origin) hace que el
    // navegador marque error cuando el front y la API están en dominios distintos.
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(204).end();
  },
);
