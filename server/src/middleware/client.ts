/**
 * Sirve el front compilado (client/dist) desde la misma API: un solo servicio en Render, sin
 * CORS y con cookies del mismo sitio para el admin.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';

const here = path.dirname(fileURLToPath(import.meta.url));
// server/dist (compilado) y server/src/middleware (tsx) llegan a la misma carpeta.
const candidates = [
  path.resolve(here, '../../client/dist'),
  path.resolve(here, '../../../client/dist'),
];

export function findClientDist(): string | null {
  return candidates.find((d) => existsSync(path.join(d, 'index.html'))) ?? null;
}

/**
 * CSP del sitio. Permite solo lo que usa: GA4, Meta Pixel, la subida a Cloudinary y sus
 * imágenes. Los pagos se abren en el dominio de Mercado Pago (navegación, no aplica CSP).
 */
export const siteCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    'script-src': ["'self'", 'https://www.googletagmanager.com', 'https://connect.facebook.net'],
    'connect-src': [
      "'self'",
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://www.googletagmanager.com',
      'https://www.facebook.com',
      'https://connect.facebook.net',
      'https://api.cloudinary.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'https://res.cloudinary.com',
      'https://www.facebook.com',
      'https://*.google-analytics.com',
      'https://www.googletagmanager.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", 'data:'],
    'frame-src': ["'none'"],
    'form-action': ["'self'"],
    // En local (http://localhost) forzar https rompería la carga de los assets.
    'upgrade-insecure-requests': env.NODE_ENV === 'production' ? [] : null,
  },
});

export function serveClient(app: Express, dist: string) {
  const index = path.join(dist, 'index.html');

  // Los archivos de assets llevan hash en el nombre: se pueden cachear un año.
  app.use(
    '/assets',
    express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }),
  );
  app.use(express.static(dist, { index: false, maxAge: '1h' }));

  // Cualquier otra ruta que no sea de la API es una ruta de la SPA.
  app.get(/^(?!\/api(\/|$)).*/, siteCsp, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}
