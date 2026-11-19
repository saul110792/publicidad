/**
 * Todo el dinero viaja y se guarda en centavos (enteros) para evitar errores de redondeo.
 * Solo se convierte a pesos al mostrarlo.
 */
export type Centavos = number;

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMXN(centavos: Centavos): string {
  return mxn.format(centavos / 100);
}
