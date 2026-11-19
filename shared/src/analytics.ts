/**
 * Eventos de medición. Los usan el front (`track()`) y el back (lista blanca de /api/events).
 * Los nombres siguen los eventos recomendados de GA4 cuando existen.
 */
export const EVENT_NAMES = [
  'page_view',
  'view_item',
  'quote_updated',
  'add_to_cart',
  'click_whatsapp',
  'begin_checkout',
  'package_offer_shown',
  'package_upgrade',
  'package_offer_dismissed',
  'purchase',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type TrackItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  quantity?: number;
  /** Pesos (no centavos), como lo espera GA4. */
  price?: number;
};

/** Parámetros que se mandan con el evento. Montos en pesos. */
export type TrackPayload = {
  currency?: 'MXN';
  value?: number;
  items?: TrackItem[];
  [key: string]: unknown;
};

export type EventRequest = {
  nombre: EventName;
  sessionId: string;
  payload: TrackPayload;
  utm?: Utm;
};

export type Utm = { source?: string; medium?: string; campaign?: string };

/** Lee utm_source/medium/campaign de un query string. NULL si no trae ninguno. */
export function parseUtm(search: string): Utm | null {
  // Sin URLSearchParams: shared también compila para Node sin tipos del DOM.
  const params: Record<string, string> = {};
  for (const pair of search.replace(/^\?/, '').split('&')) {
    const [k, v = ''] = pair.split('=');
    if (!k) continue;
    try {
      params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      // Parámetro mal codificado: se ignora.
    }
  }
  const clean = (v: string | undefined) => v?.trim().slice(0, 100) || undefined;
  const utm: Utm = {
    source: clean(params.utm_source),
    medium: clean(params.utm_medium),
    campaign: clean(params.utm_campaign),
  };
  return utm.source || utm.medium || utm.campaign ? utm : null;
}

/** Centavos → pesos para GA4/Pixel. NULL se omite (precio por confirmar). */
export function toPesos(centavos: number | null | undefined): number | undefined {
  return centavos == null ? undefined : centavos / 100;
}

/**
 * Evento equivalente de Meta Pixel. Los que no tienen estándar se mandan como personalizados.
 * Purchase exige `value`: si el total está por confirmar se manda como personalizado.
 */
export function toMetaEvent(
  name: EventName,
  payload: TrackPayload,
): { kind: 'track' | 'trackCustom'; name: string } {
  switch (name) {
    case 'page_view':
      return { kind: 'track', name: 'PageView' };
    case 'view_item':
      return { kind: 'track', name: 'ViewContent' };
    case 'add_to_cart':
      return { kind: 'track', name: 'AddToCart' };
    case 'begin_checkout':
      return { kind: 'track', name: 'InitiateCheckout' };
    case 'click_whatsapp':
      return { kind: 'track', name: 'Contact' };
    case 'purchase':
      return payload.value != null
        ? { kind: 'track', name: 'Purchase' }
        : { kind: 'trackCustom', name: 'PurchasePendingPrice' };
    default:
      return { kind: 'trackCustom', name };
  }
}
