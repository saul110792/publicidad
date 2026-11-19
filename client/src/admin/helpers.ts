import { ORDER_STATUSES, PAYMENT_METHODS, type PaymentState } from '@publicidad/shared';
import { price } from '../lib/format';
import s from './admin.module.css';

export { s as styles };

/** Pesos → centavos. Vacío = NULL (la tienda muestra "$[PRECIO]"). */
export function parsePesos(text: string): number | null | 'invalid' {
  const clean = text.replace(/[$,s]/g, '');
  if (clean === '') return null;
  if (!/^-?d+(.d{1,2})?$/.test(clean)) return 'invalid';
  return Math.round(Number(clean) * 100);
}

export function toPesosText(centavos: number | null | undefined): string {
  if (centavos == null) return '';
  return (centavos / 100).toFixed(centavos % 100 === 0 ? 0 : 2);
}

const dateFmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
export const fecha = (iso: string) => dateFmt.format(new Date(iso));

export const estadoLabel = (v: string) => ORDER_STATUSES.find((x) => x.value === v)?.label ?? v;
export const metodoLabel = (v: string) => PAYMENT_METHODS.find((x) => x.value === v)?.label ?? v;

export const PAYMENT_STATES: { value: PaymentState; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'fallido', label: 'Fallido' },
  { value: 'reembolsado', label: 'Reembolsado' },
];

/** Precio o "Por definir" (en el admin se ve claro qué falta capturar). */
export const money = (c: number | null | undefined) => (c == null ? 'Por definir' : price(c));

/** Slug a partir de un nombre: "Tarjetas de cita" → "tarjetas-de-cita". */
export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
