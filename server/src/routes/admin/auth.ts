import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AdminMeDTO } from '@publicidad/shared';
import { db } from '../../db/client';
import { admins } from '../../db/schema';
import { HttpError } from '../../middleware/errors';
import { requireAdmin } from '../../middleware/requireAdmin';
import {
  SESSION_COOKIE,
  authEnabled,
  clearLoginFailures,
  cookieOptions,
  createSessionToken,
  loginLocked,
  registerLoginFailure,
  verifyPassword,
} from '../../services/auth';
import { parse } from '../../services/validation';

export const adminAuthRouter = Router();

const loginBody = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

// Hash válido de una contraseña que nadie tiene: compara aunque el correo no exista, para que
// el tiempo de respuesta no revele qué correos son de admin.
const DUMMY_HASH = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

adminAuthRouter.post('/login', async (req, res) => {
  if (!authEnabled) throw new HttpError(503, 'El acceso al admin no está configurado.');
  const { email, password } = parse(loginBody, req.body);
  const key = `${req.ip}|${email.toLowerCase()}`;
  if (loginLocked(key) || loginLocked(req.ip ?? '')) {
    throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.');
  }

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email.toLowerCase()))
    .limit(1);
  const ok = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) {
    registerLoginFailure(key);
    registerLoginFailure(req.ip ?? '');
    throw new HttpError(401, 'Correo o contraseña incorrectos.');
  }

  clearLoginFailures(key);
  res.cookie(SESSION_COOKIE, createSessionToken(admin.id), cookieOptions);
  const body: AdminMeDTO = { email: admin.email };
  res.json(body);
});

adminAuthRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
});

adminAuthRouter.get('/me', requireAdmin, async (req, res) => {
  const [admin] = await db
    .select({ email: admins.email })
    .from(admins)
    .where(eq(admins.id, req.adminId!))
    .limit(1);
  if (!admin) throw new HttpError(401, 'Inicia sesión');
  const body: AdminMeDTO = admin;
  res.json(body);
});
