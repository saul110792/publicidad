import { useCallback, useEffect, useState } from 'react';
import { apiGet } from './api';

type State<T> = { path: string; data?: T; error?: string };

/**
 * GET con cancelación. Mientras carga una ruta nueva conserva los datos anteriores
 * (así los filtros no hacen parpadear la página) y marca loading = true.
 */
export function useApi<T>(path: string) {
  const [state, setState] = useState<State<T>>({ path: '' });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    apiGet<T>(path, ctrl.signal).then(
      (data) => setState({ path, data }),
      (err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState((prev) => ({
          path,
          data: prev.data,
          error: err instanceof Error ? err.message : 'Error de red',
        }));
      },
    );
    return () => ctrl.abort();
  }, [path, nonce]);

  return {
    data: state.data,
    error: state.path === path ? state.error : undefined,
    loading: state.path !== path,
    /** Vuelve a pedir la misma ruta (conserva los datos mientras llega). */
    reload,
  };
}
