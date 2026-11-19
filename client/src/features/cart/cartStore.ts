/**
 * Carrito en el navegador (localStorage). Solo guarda slugs, opciones y archivos subidos;
 * precios y nombres siempre los da el back (`POST /api/cart`).
 */
import { useSyncExternalStore } from 'react';
import type { CartFile, CartLineInput, PackageOfferDTO, Selection } from '@publicidad/shared';

const KEY = 'publicidad.cart.v1';

export type CartState = {
  lineas: CartLineInput[];
  /** Paquetes que el cliente rechazó con "No, gracias". */
  rechazadas: string[];
  /** Carrito antes de "Cambiar a paquete", para "Deshacer". */
  deshacer: { lineas: CartLineInput[]; paquete: string } | null;
};

const EMPTY: CartState = { lineas: [], rechazadas: [], deshacer: null };

function read(): CartState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      lineas: Array.isArray(parsed.lineas) ? parsed.lineas : [],
      rechazadas: Array.isArray(parsed.rechazadas) ? parsed.rechazadas : [],
      deshacer: parsed.deshacer ?? null,
    };
  } catch {
    return EMPTY;
  }
}

let state: CartState = read();
const listeners = new Set<() => void>();

function set(next: CartState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Modo privado o almacenamiento lleno: el carrito sigue funcionando en memoria.
  }
  listeners.forEach((l) => l());
}

// Mantiene el carrito sincronizado entre pestañas.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCart(): CartState {
  return useSyncExternalStore(subscribe, () => state);
}

function newId() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
    .replace(/[^\w-]/g, '')
    .slice(0, 36);
}

export const cart = {
  addProduct(productSlug: string, opciones: Selection, archivo: CartFile | null) {
    set({
      ...state,
      deshacer: null,
      lineas: [...state.lineas, { id: newId(), tipo: 'producto', productSlug, opciones, archivo }],
    });
  },

  /** Agrega un paquete desde su tarjeta. Si ya está en el carrito no lo duplica. */
  addPackage(packageSlug: string) {
    if (state.lineas.some((l) => l.tipo === 'paquete' && l.packageSlug === packageSlug)) return;
    set({
      ...state,
      deshacer: null,
      lineas: [...state.lineas, { id: newId(), tipo: 'paquete', packageSlug, componentes: [] }],
    });
  },

  remove(id: string) {
    set({ ...state, deshacer: null, lineas: state.lineas.filter((l) => l.id !== id) });
  },

  /** Quita líneas que el back reporta como no disponibles. */
  removeMany(ids: string[]) {
    if (!ids.length) return;
    set({ ...state, lineas: state.lineas.filter((l) => !ids.includes(l.id)) });
  },

  /**
   * "Cambiar a paquete": reemplaza las líneas cubiertas por el paquete, conservando sus
   * opciones y archivos dentro del paquete. El paquete queda en el lugar de la primera.
   */
  acceptOffer(offer: PackageOfferDTO) {
    const ids = new Set(offer.cubiertos.map((c) => c.lineaId));
    const covered = state.lineas.filter((l) => ids.has(l.id));
    if (!covered.length) return; // Oferta vieja: el carrito ya cambió.
    const componentes = covered.flatMap((l) =>
      l.tipo === 'producto'
        ? [{ productSlug: l.productSlug, opciones: l.opciones, archivo: l.archivo ?? null }]
        : [],
    );
    const pkgLine: CartLineInput = {
      id: newId(),
      tipo: 'paquete',
      packageSlug: offer.paquete.slug,
      componentes,
      desdeOferta: true,
    };
    const lineas: CartLineInput[] = [];
    let placed = false;
    for (const l of state.lineas) {
      if (!ids.has(l.id)) lineas.push(l);
      else if (!placed) {
        lineas.push(pkgLine);
        placed = true;
      }
    }
    set({ ...state, lineas, deshacer: { lineas: state.lineas, paquete: offer.paquete.nombre } });
  },

  undo() {
    if (!state.deshacer) return;
    set({ ...state, lineas: state.deshacer.lineas, deshacer: null });
  },

  dismissUndo() {
    if (state.deshacer) set({ ...state, deshacer: null });
  },

  dismissOffer(packageSlug: string) {
    if (state.rechazadas.includes(packageSlug)) return;
    set({ ...state, rechazadas: [...state.rechazadas, packageSlug] });
  },

  clear() {
    set(EMPTY);
  },
};
