/**
 * Medición. Todo el sitio llama a `track(evento, payload)`; este módulo lo reparte a:
 *  - GA4 (si hay VITE_GA4_ID)
 *  - Meta Pixel (si hay VITE_META_PIXEL_ID)
 *  - la API propia (/api/events), que alimenta el embudo del dashboard aunque no haya GA4.
 *
 * Los scripts de GA4 y Pixel se descargan después de que la página termina de cargar para no
 * afectar el rendimiento; mientras tanto sus stubs encolan los eventos.
 */
import {
  parseUtm,
  toMetaEvent,
  type EventName,
  type TrackPayload,
  type Utm,
} from '@publicidad/shared';

const GA4_ID = (import.meta.env.VITE_GA4_ID ?? '').trim();
const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID ?? '').trim();
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const UTM_KEY = 'publicidad.utm.v1';
const SESSION_KEY = 'publicidad.session.v1';
/** Ventana de atribución: una UTM vale 30 días o hasta que llegue otra (último clic). */
const UTM_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Gtag = (...args: unknown[]) => void;
type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  callMethod?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// --- Almacenamiento seguro (modo privado puede bloquearlo) ---

function readJson<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: la medición sigue funcionando sin persistencia.
  }
}

// --- UTMs ---

/** Guarda las UTMs de la URL actual (último clic gana). Se llama al arrancar la app. */
export function captureUtm(search = window.location.search) {
  const utm = parseUtm(search);
  if (utm) writeJson(() => localStorage, UTM_KEY, { utm, at: Date.now() });
}

/** UTMs vigentes, para mandarlas con leads, pedidos y eventos. */
export function getUtm(): Utm | undefined {
  const saved = readJson<{ utm: Utm; at: number }>(() => localStorage, UTM_KEY);
  if (!saved || Date.now() - saved.at > UTM_TTL_MS) return undefined;
  return saved.utm;
}

// --- Sesión ---

let memorySession: string | null = null;

/** Id anónimo por pestaña/visita para contar el embudo por sesión. */
export function getSessionId(): string {
  const saved = readJson<string>(() => sessionStorage, SESSION_KEY) ?? memorySession;
  if (saved) return saved;
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  memorySession = id;
  writeJson(() => sessionStorage, SESSION_KEY, id);
  return id;
}

// --- Proveedores ---

let started = false;

function loadScript(src: string) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function initGa4() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag necesita el objeto `arguments` tal cual.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  // page_view lo manda la app en cada cambio de ruta (SPA).
  window.gtag('config', GA4_ID, { send_page_view: false });
}

function initPixel() {
  // Mismo stub que el snippet oficial de Meta: encola `arguments` hasta que carga fbevents.js.
  const fbq = function () {
    /* eslint-disable prefer-rest-params, prefer-spread */
    if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments as unknown as unknown[]);
    else fbq.queue!.push(arguments);
    /* eslint-enable prefer-rest-params, prefer-spread */
  } as Fbq;
  Object.assign(fbq, { push: fbq, loaded: true, version: '2.0', queue: [] });
  window.fbq = window._fbq = fbq;
  fbq('init', PIXEL_ID);
}

/** Arranca la medición. Los scripts externos se cargan cuando la página ya cargó. */
export function initAnalytics() {
  if (started) return;
  started = true;
  captureUtm();
  // Los stubs encolan desde ya; los scripts reales se descargan después del load.
  if (GA4_ID) initGa4();
  if (PIXEL_ID) initPixel();
  const load = () => {
    if (GA4_ID) {
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`);
    }
    if (PIXEL_ID) loadScript('https://connect.facebook.net/en_US/fbevents.js');
  };
  if (document.readyState === 'complete') setTimeout(load, 0);
  else window.addEventListener('load', () => setTimeout(load, 0), { once: true });
}

// --- track ---

function sendToApi(nombre: EventName, payload: TrackPayload) {
  const body = JSON.stringify({ nombre, sessionId: getSessionId(), payload, utm: getUtm() });
  const url = `${API_BASE}/api/events`;
  try {
    // sendBeacon sobrevive a la navegación (por ejemplo, al ir a pagar).
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    // Sigue con fetch.
  }
  fetch(url, {
    method: 'POST',
    // text/plain es una petición simple: sin preflight de CORS si la API está en otro dominio.
    headers: { 'Content-Type': 'text/plain' },
    body,
    keepalive: true,
  }).catch(() => {});
}

const listeners = new Set<(name: EventName, payload: TrackPayload) => void>();

/** Para depurar en desarrollo: `onTrack((e, p) => console.log(e, p))`. */
export function onTrack(fn: (name: EventName, payload: TrackPayload) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Manda un evento a GA4, Meta Pixel y la API. Nunca lanza errores. */
export function track(name: EventName, payload: TrackPayload = {}) {
  const data: TrackPayload =
    payload.value != null || payload.items ? { currency: 'MXN', ...payload } : payload;
  try {
    if (GA4_ID && window.gtag) window.gtag('event', name, data);
    if (PIXEL_ID && window.fbq) {
      const meta = toMetaEvent(name, data);
      window.fbq(meta.kind, meta.name, data);
    }
    sendToApi(name, data);
    listeners.forEach((l) => l(name, data));
    if (import.meta.env.DEV) console.debug('[track]', name, data);
  } catch {
    // La medición nunca debe romper la página.
  }
}

const ONCE_KEY = 'publicidad.tracked.v1';

/**
 * Ejecuta `fn` solo la primera vez para esa llave en este navegador (ej. `purchase` por folio,
 * para no contar dos veces la compra si el cliente recarga la confirmación).
 */
export function trackOnce(key: string, fn: () => void) {
  const done = readJson<string[]>(() => localStorage, ONCE_KEY) ?? [];
  if (done.includes(key)) return;
  writeJson(() => localStorage, ONCE_KEY, [...done, key].slice(-50));
  fn();
}
