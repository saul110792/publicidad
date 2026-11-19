import { useEffect } from 'react';
import { site } from '../config/site';

const DEFAULT_TITLE = `${site.brand} · ${site.tagline}`;
const DEFAULT_DESCRIPTION =
  'Imprenta y publicidad para negocios: tarjetas, flyers, lonas, promocionales, identidad de marca y servicios digitales. Cotiza en línea.';

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Título y descripción de la página (pestaña, buscadores y vista previa al compartir).
 * `title` vacío = título general del sitio.
 */
export function usePageMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${site.brand}` : DEFAULT_TITLE;
    const desc = description?.trim() || DEFAULT_DESCRIPTION;
    document.title = fullTitle;
    setMeta('description', desc);
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
  }, [title, description]);
}
