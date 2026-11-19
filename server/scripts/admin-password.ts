/**
 * Crea un admin o cambia su contraseña.
 *   npm run admin:password -w @publicidad/server -- correo@ejemplo.com
 * La contraseña se lee de la variable ADMIN_PASSWORD (para que no quede en el historial).
 */
import { eq } from 'drizzle-orm';
import { db, pool } from '../src/db/client';
import { admins } from '../src/db/schema';
import { hashPassword } from '../src/services/auth';

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';

if (!email || password.length < 10) {
  console.error('Uso: ADMIN_PASSWORD=... npm run admin:password -- correo (mínimo 10 caracteres)');
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const [found] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
if (found) {
  await db.update(admins).set({ passwordHash }).where(eq(admins.id, found.id));
  console.log(`Contraseña actualizada para ${email}.`);
} else {
  await db.insert(admins).values({ email, passwordHash });
  console.log(`Admin creado: ${email}.`);
}
await pool.end();
