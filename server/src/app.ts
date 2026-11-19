import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { allowedOrigins, serveClient as shouldServeClient } from './config/env';
import { findClientDist, serveClient } from './middleware/client';
import { errorHandler, notFound } from './middleware/errors';
import { catalogRouter } from './routes/catalog';
import { ordersRouter } from './routes/orders';
import { paymentsRouter } from './routes/payments';
import { eventsRouter } from './routes/events';
import { adminRouter } from './routes/admin';
import { quoteRouter } from './routes/quote';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render corre detrás de un proxy
  // same-origin-allow-popups: "Cotizar por WhatsApp" abre una ventana y luego le pone la URL.
  app.use(helmet({ crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } }));
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', catalogRouter);
  app.use('/api', quoteRouter);
  app.use('/api', ordersRouter);
  app.use('/api', paymentsRouter);
  app.use('/api', eventsRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', notFound);

  if (shouldServeClient) {
    const dist = findClientDist();
    if (dist) serveClient(app, dist);
    else console.warn('SERVE_CLIENT activo pero no existe client/dist: corre npm run build.');
  }

  app.use(errorHandler);

  return app;
}
