import { randomInt } from 'node:crypto';

// Sin 0/O ni 1/I/L para que se pueda dictar por teléfono sin confusiones.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Folio público del pedido, ej. P-7KQ2MX. Aleatorio para que no se puedan adivinar otros. */
export function generateFolio(): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `P-${out}`;
}

export const FOLIO_PATTERN = /^P-[A-HJ-NP-Z2-9]{6}$/;
