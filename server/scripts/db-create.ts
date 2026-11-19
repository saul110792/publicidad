/**
 * Crea la base de datos indicada en DATABASE_URL si todavía no existe.
 * Se conecta a la base "postgres" del mismo servidor para poder crearla.
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL en server/.env');
  process.exit(1);
}

const target = new URL(url);
const dbName = decodeURIComponent(target.pathname.slice(1));
if (!/^[a-z0-9_]+$/i.test(dbName)) {
  console.error(`Nombre de base inválido: ${dbName}`);
  process.exit(1);
}

const admin = new URL(url);
admin.pathname = '/postgres';

const client = new pg.Client({ connectionString: admin.toString() });
try {
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rowCount) {
    console.log(`La base "${dbName}" ya existe.`);
  } else {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Base "${dbName}" creada.`);
  }
} catch (err) {
  console.error('No se pudo conectar a Postgres:', (err as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
