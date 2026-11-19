import { useEffect, useState } from 'react';
import type { QuoteDTO, Selection } from '@publicidad/shared';
import { apiPost } from '../../lib/api';

type State = { key: string; quote?: QuoteDTO; error?: string };

/**
 * Pide la cotización al back cada vez que cambia la selección (con un pequeño debounce).
 * El precio nunca se calcula en el front.
 */
export function useQuote(productSlug: string | undefined, selection: Selection) {
  const key = productSlug ? `${productSlug}:${JSON.stringify(selection)}` : '';
  const [state, setState] = useState<State>({ key: '' });

  useEffect(() => {
    if (!productSlug) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      apiPost<QuoteDTO>('/api/quote', { productSlug, opciones: selection }, ctrl.signal).then(
        (quote) => setState({ key, quote }),
        (err: unknown) => {
          if (ctrl.signal.aborted) return;
          setState((prev) => ({
            key,
            quote: prev.quote,
            error: err instanceof Error ? err.message : 'Error de red',
          }));
        },
      );
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // `key` ya codifica productSlug + selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    quote: state.quote,
    error: state.key === key ? state.error : undefined,
    loading: state.key !== key,
  };
}
