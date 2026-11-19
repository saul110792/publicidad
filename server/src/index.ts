import { createApp } from './app';
import { env } from './config/env';
import { ensureBootstrapAdmin } from './services/auth';
import { pool } from './db/client';

ensureBootstrapAdmin().catch((err) => console.error('No se pudo crear el admin inicial:', err));

const server = createApp().listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
});

// Render manda SIGTERM al reemplazar la instancia en cada deploy: termina lo que está en curso.
function shutdown(signal: string) {
  console.log(`${signal}: cerrando…`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  // Si algo se queda colgado, salir de todos modos.
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
