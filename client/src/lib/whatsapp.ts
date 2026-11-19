import { site } from '../config/site';

/** Arma el link de wa.me con el mensaje prellenado (opcional). */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${site.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
