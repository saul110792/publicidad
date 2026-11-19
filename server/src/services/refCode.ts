import { randomBytes } from 'node:crypto';

/**
 * Código corto para ligar un clic de WhatsApp con la venta: PREFIJO-XXXX (ej. TJ-4F2A).
 * El prefijo viene del producto; si no tiene, se toman las dos primeras letras del slug.
 */
export function generateRefCode(prefixOrSlug: string): string {
  const prefix = (
    prefixOrSlug
      .replace(/[^a-z]/gi, '')
      .slice(0, 2)
      .toUpperCase() || 'XX'
  ).padEnd(2, 'X');
  return `${prefix}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

export const REF_CODE_PATTERN = /^[A-Z]{2}-[0-9A-F]{4}$/;

/** Error de Postgres por llave única duplicada. Drizzle lo envuelve en `cause`. */
export function isUniqueViolation(err: unknown): boolean {
  const code = (e: unknown) => (e as { code?: string } | null)?.code;
  return code(err) === '23505' || code((err as { cause?: unknown })?.cause) === '23505';
}
