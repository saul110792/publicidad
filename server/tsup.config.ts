import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  sourcemap: true,
  // El paquete shared se publica como TypeScript, así que se empaqueta dentro del build.
  noExternal: [/^@publicidad\/shared/],
});
