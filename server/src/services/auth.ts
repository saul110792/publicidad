/**
 * Autenticación del admin sin dependencias externas:
 *  - Contraseñas con scrypt (sal aleatoria por usuario).
 *  - Sesión en una cookie httpOnly firmada con HMAC-SHA256: `adminId.expira.firma`.
 *    No se guarda en BD; cerrar sesión borra la cookie y cambiar SESSION_SECRET invalida todas.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { db } from '../db/client';
import { admins } from '../db/schema';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function resolveSecret(): string {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.NODE_ENV === 'production') {
    // Sin secreto en producción el admin no puede iniciar sesión (mejor que uno adivinable).
    console.error('Falta SESSION_SECRET: el inicio de sesión del admin está desactivado.');
    return '';
  }
  // En desarrollo se genera uno por proceso: reiniciar el server cierra las sesiones.
  return randomBytes(32).toString('hex');
}

const SECRET = resolveSecret();
export const authEnabled = SECRET !== '';

// --- Contraseñas ---

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize('NFKC'), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltHex, 'hex'), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- Sesión ---

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function createSessionToken(adminId: number, now = Date.now(), secret = SECRET): string {
  const data = `${adminId}.${now + SESSION_TTL_MS}`;
  return `${data}.${sign(data, secret)}`;
}

/** Devuelve el id del admin si el token es válido y no ha vencido. */
export function readSessionToken(
  token: string | undefined,
  now = Date.now(),
  secret = SECRET,
): number | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts as [string, string, string];
  const expected = Buffer.from(sign(`${id}.${exp}`, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(exp) || Number(exp) < now) return null;
  return Number(id);
}

/** Lee una cookie del header sin depender de cookie-parser. */
export function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api',
  maxAge: SESSION_TTL_MS,
};

// --- Intentos de login ---

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

/** Bloquea 15 min una IP o correo tras 5 intentos fallidos seguidos. */
export function loginLocked(key: string, now = Date.now()): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= MAX_ATTEMPTS && a.until > now;
}

export function registerLoginFailure(key: string, now = Date.now()) {
  const a = attempts.get(key);
  const count = a && a.until > now ? a.count + 1 : 1;
  attempts.set(key, { count, until: now + LOCK_MS });
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

// --- Primer admin ---

/** Crea el admin de ADMIN_EMAIL/ADMIN_PASSWORD si no existe. No cambia contraseñas existentes. */
export async function ensureBootstrapAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const email = env.ADMIN_EMAIL.toLowerCase();
  const [found] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
  if (found) return;
  await db.insert(admins).values({ email, passwordHash: await hashPassword(env.ADMIN_PASSWORD) });
  console.log(`Admin creado: ${email}`);
}
