import { formatMXN, GIROS } from '@publicidad/shared';

export const PRICE_PLACEHOLDER = '$[PRECIO]';

/** Precio en MXN o el placeholder si el negocio aún no lo define. */
export function price(centavos: number | null | undefined): string {
  return centavos == null ? PRICE_PLACEHOLDER : formatMXN(centavos);
}

export function giroLabel(giro: string | null): string {
  if (!giro) return 'Cualquier negocio';
  return GIROS.find((g) => g.value === giro)?.label ?? giro;
}

const nf = new Intl.NumberFormat('es-MX');
export function qty(n: number): string {
  return nf.format(n);
}
