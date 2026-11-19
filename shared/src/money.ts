/**
 * Todo el dinero viaja y se guarda en centavos (enteros) para evitar errores de redondeo.
 * Solo se convierte a pesos al mostrarlo.
 */
export type Centavos = number;

const whole = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const cents = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,150 si son pesos cerrados; $2.30 si hay centavos (nunca "$2.3"). */
export function formatMXN(centavos: Centavos): string {
  return (centavos % 100 === 0 ? whole : cents).format(centavos / 100);
}
