import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Al navegar: si hay #ancla baja hasta ella; si no, regresa arriba.
 * Los cambios de filtros navegan con state.keepScroll para no saltar al inicio.
 */
export function ScrollManager() {
  const { pathname, hash, state } = useLocation();
  const keepScroll = (state as { keepScroll?: boolean } | null)?.keepScroll === true;

  useEffect(() => {
    if (keepScroll) return;
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, keepScroll]);

  return null;
}
