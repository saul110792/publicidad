/** Aplica las migraciones pendientes. Se usa en local y al arrancar en Render. */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.join(here, 'migrations');

await migrate(db, { migrationsFolder });
console.log('Migraciones aplicadas.');
await pool.end();
