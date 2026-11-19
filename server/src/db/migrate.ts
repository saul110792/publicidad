/** Aplica las migraciones pendientes. Se usa en local y al arrancar en Render. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';

const here = path.dirname(fileURLToPath(import.meta.url));
// En local corre desde src/db; compilado corre desde dist/ y las migraciones siguen en src/db.
const migrationsFolder =
  process.env.MIGRATIONS_DIR ??
  [path.join(here, 'migrations'), path.join(here, '../src/db/migrations')].find((d) =>
    existsSync(d),
  )!;

await migrate(db, { migrationsFolder });
console.log('Migraciones aplicadas.');
await pool.end();
