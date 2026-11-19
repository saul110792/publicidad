import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  /** cloudinary://API_KEY:API_SECRET@CLOUD_NAME. Sin él, la subida de archivos se desactiva. */
  CLOUDINARY_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^cloudinary:\/\/[^:]+:[^@]+@[\w-]+$/)
      .optional(),
  ),
  /** Costo del envío a domicilio en centavos. Sin él, el envío queda "por confirmar". */
  SHIPPING_COST: z.preprocess(emptyToUndefined, z.coerce.number().int().nonnegative().optional()),
  /**
   * Proveedor de pagos: "mercadopago" o "mock" (pago simulado, solo fuera de producción).
   * Vacío = mercadopago si hay MP_ACCESS_TOKEN; si no, el pago con tarjeta se coordina por WhatsApp.
   */
  PAYMENT_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['mercadopago', 'mock']).optional()),
  MP_ACCESS_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  /** "Clave secreta" de las notificaciones (webhooks) en el panel de Mercado Pago. */
  MP_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  /** URL pública https de la API, para que Mercado Pago mande los webhooks. */
  API_PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  /** Servir client/dist desde la API. Por defecto: sí en producción, no en desarrollo. */
  SERVE_CLIENT: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  /** Firma la cookie de sesión del admin. Obligatoria en producción (Render la genera). */
  SESSION_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  /** Primer admin: se crea al arrancar si no existe ese correo. */
  ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
  ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
});

function emptyToUndefined(v: unknown) {
  return typeof v === 'string' && v.trim() === '' ? undefined : v;
}

// API_PORT (local) tiene prioridad sobre PORT (Render). Así el server no choca con Vite
// cuando alguna herramienta exporta PORT para el front.
// En Render, RENDER_EXTERNAL_URL (https://<servicio>.onrender.com) sirve de respaldo para la URL
// pública: el front y la API viven en el mismo servicio.
const renderUrl = process.env.RENDER_EXTERNAL_URL;
const parsed = schema.safeParse({
  ...process.env,
  PORT: process.env.API_PORT ?? process.env.PORT,
  CLIENT_URL: process.env.CLIENT_URL || renderUrl,
  API_PUBLIC_URL: process.env.API_PUBLIC_URL || renderUrl,
});

if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;

export const serveClient = env.SERVE_CLIENT
  ? env.SERVE_CLIENT === 'true'
  : env.NODE_ENV === 'production';

export const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());

/** URL pública del front (la primera de CLIENT_URL): de aquí salen las URLs de regreso del pago. */
export const clientUrl = allowedOrigins[0]!.replace(/\/$/, '');
