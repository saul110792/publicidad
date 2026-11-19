import { defineConfig } from 'tsup';

export default defineConfig({
  // index: la API; migrate y seed: se corren al arrancar en Render (sin tsx).
  entry: { index: 'src/index.ts', migrate: 'src/db/migrate.ts', seed: 'src/db/seed.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: true,
  // El paquete shared se publica como TypeScript, así que se empaqueta dentro del build.
  noExternal: [/^@publicidad\/shared/],
});
