import { useEffect, useState } from 'react';
import type { CartDTO } from '@publicidad/shared';
import { apiPost } from '../../lib/api';
import { cart, type CartState } from './cartStore';

type State = { key: string; data?: CartDTO; error?: string };

/** Cotiza el carrito en el back cada vez que cambia. Conserva lo anterior mientras carga. */
export function useCartQuote({ lineas, rechazadas }: CartState) {
  const key = JSON.stringify({ lineas, rechazadas });
  const [state, setState] = useState<State>({ key: '' });

  useEffect(() => {
    if (!lineas.length) return;
    const ctrl = new AbortController();
    apiPost<CartDTO>('/api/cart', { lineas, ofertasRechazadas: rechazadas }, ctrl.signal).then(
      (data) => {
        setState({ key, data });
        // Lo que ya no existe en el catálogo se quita solo.
        cart.removeMany(data.lineas.filter((l) => !l.disponible).map((l) => l.id));
      },
      (err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState((prev) => ({
          key,
          data: prev.data,
          error: err instanceof Error ? err.message : 'Error de red',
        }));
      },
    );
    return () => ctrl.abort();
    // `key` ya codifica lineas + rechazadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: lineas.length ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: lineas.length > 0 && state.key !== key,
  };
}
