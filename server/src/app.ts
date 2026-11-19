import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { allowedOrigins } from './config/env';
import { errorHandler, notFound } from './middleware/errors';
import { catalogRouter } from './routes/catalog';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render corre detrás de un proxy
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', catalogRouter);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
