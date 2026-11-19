import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
});

// API_PORT (local) tiene prioridad sobre PORT (Render). Así el server no choca con Vite
// cuando alguna herramienta exporta PORT para el front.
const parsed = schema.safeParse({
  ...process.env,
  PORT: process.env.API_PORT ?? process.env.PORT,
});

if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());
