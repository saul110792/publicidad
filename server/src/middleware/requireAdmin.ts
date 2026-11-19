import type { RequestHandler } from 'express';
import { allowedOrigins } from '../config/env';
import { SESSION_COOKIE, getCookie, readSessionToken } from '../services/auth';
import { HttpError } from './errors';

declare module 'express-serve-static-core' {
  interface Request {
    adminId?: number;
  }
}

/**
 * Protege /api/admin: exige la cookie de sesión válida.
 * En peticiones que modifican datos además revisa que el Origin sea el del sitio (defensa
 * extra contra CSRF, además de SameSite=Lax en la cookie).
 */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const adminId = readSessionToken(getCookie(req.headers.cookie, SESSION_COOKIE));
  if (!adminId) throw new HttpError(401, 'Inicia sesión');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin) && !isSameHost(origin, req.headers.host)) {
      throw new HttpError(403, 'Origen no permitido');
    }
  }
  req.adminId = adminId;
  next();
};

function isSameHost(origin: string, host: string | undefined) {
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
