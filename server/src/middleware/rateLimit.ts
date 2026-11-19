/**
 * Límites de peticiones por IP para las rutas públicas. Render corre una sola instancia, así que
 * el contador en memoria basta; con varias instancias habría que usar un store compartido.
 * `trust proxy` ya está activo para leer la IP real detrás del proxy de Render.
 */
import { rateLimit, type Options } from 'express-rate-limit';

const MIN = 60 * 1000;

const limiter = (windowMs: number, limit: number, message: string, extra: Partial<Options> = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
    ...extra,
  });

/** Tope general para toda la API (incluye lecturas del catálogo). */
export const apiLimiter = limiter(MIN, 600, 'Demasiadas peticiones. Espera un momento.', {
  // Los webhooks del proveedor de pagos no deben frenarse.
  skip: (req) => req.path.startsWith('/payments/webhook/'),
});

/** "Cotizar por WhatsApp": cada clic crea un lead. */
export const leadsLimiter = limiter(
  10 * MIN,
  20,
  'Demasiadas cotizaciones seguidas. Intenta en unos minutos.',
);

/** Crear pedidos y abrir pagos. */
export const ordersLimiter = limiter(
  10 * MIN,
  15,
  'Demasiados pedidos seguidos. Intenta en unos minutos.',
);

/** Firmas de subida a Cloudinary. */
export const uploadsLimiter = limiter(
  10 * MIN,
  30,
  'Demasiados archivos seguidos. Intenta en unos minutos.',
);

/** Cotizador y carrito: se llaman en cada cambio de opción. */
export const quoteLimiter = limiter(MIN, 120, 'Demasiadas cotizaciones. Espera un momento.');

/** Eventos de medición (varios por página). */
export const eventsLimiter = limiter(MIN, 300, 'Demasiados eventos.');
