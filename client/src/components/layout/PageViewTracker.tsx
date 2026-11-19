import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { captureUtm, track } from '../../lib/analytics';

/**
 * `page_view` en cada cambio de ruta (la app es SPA y GA4 no lo detecta solo).
 * Los cambios de filtros solo cambian el query string y no cuentan como página nueva.
 */
export function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    captureUtm(search);
    track('page_view', {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
    // `search` se lee al cambiar de ruta, pero no dispara un page_view por sí solo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
