import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

// El pool no se conecta hasta la primera consulta, así que importar esto no falla sin BD.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema, casing: 'snake_case' });
export type DB = typeof db;
