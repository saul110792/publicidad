import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

// El pool no se conecta hasta la primera consulta, así que importar esto no falla sin BD.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: needsSsl(env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
});

/**
 * SSL solo cuando hace falta: la URL interna de Render (host sin dominio, ej. dpg-xxx-a) y
 * localhost van sin SSL; la externa (*.render.com) o con sslmode=require, con SSL.
 */
export function needsSsl(url: string | undefined): boolean {
  if (!url) return false;
  if (/[?&]sslmode=(require|verify-ca|verify-full)/.test(url)) return true;
  try {
    return new URL(url).hostname.endsWith('.render.com');
  } catch {
    return false;
  }
}

export const db = drizzle(pool, { schema, casing: 'snake_case' });
export type DB = typeof db;
