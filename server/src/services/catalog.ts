import { z } from 'zod';
import { GIROS, SORT_OPTIONS, type Centavos } from '@publicidad/shared';

const flag = z
  .enum(['1', 'true', '0', 'false'])
  .optional()
  .transform((v) => v === '1' || v === 'true');

/** Query params de GET /api/products. Lo inválido se ignora en lugar de romper la página. */
export const productQuerySchema = z.object({
  cat: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9-]+$/.test(s)),
    ),
  q: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim().slice(0, 80)),
  giro: z
    .enum(GIROS.map((g) => g.value) as [string, ...string[]])
    .optional()
    .catch(undefined),
  rapida: flag.catch(false),
  diseno: flag.catch(false),
  orden: z
    .enum(SORT_OPTIONS.map((o) => o.value) as [string, ...string[]])
    .optional()
    .catch(undefined)
    .transform((v) => v ?? 'populares'),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

/** Escapa los comodines de LIKE para que el texto del usuario se busque literal. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Precio "desde": precio unitario × cantidad mínima. NULL si aún no hay precio. */
export function precioDesde(precioBase: Centavos | null, cantidadMinima: number | null) {
  if (precioBase == null) return null;
  return precioBase * (cantidadMinima ?? 1);
}
