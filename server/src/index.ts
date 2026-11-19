import { createApp } from './app';
import { env } from './config/env';
import { ensureBootstrapAdmin } from './services/auth';

ensureBootstrapAdmin().catch((err) => console.error('No se pudo crear el admin inicial:', err));

createApp().listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
});
