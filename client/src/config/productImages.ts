/**
 * Ilustraciones de muestra (client/public/img/productos, generadas con
 * scripts/generate-illustrations.mjs). Si el producto tiene fotos en el admin, se usan esas.
 */
const ILLUSTRATED = new Set([
  'tarjetas-de-presentacion',
  'flyers',
  'menus',
  'talonarios',
  'recetarios',
  'tarjetas-de-cita',
  'etiquetas',
  'lonas',
  'vinil-vitrina',
  'letrero-exterior',
  'rotulacion-vehicular',
  'playeras',
  'uniformes',
  'bolsas',
  'logotipo',
  'perfil-instagram',
  'google-maps',
  'landing-page',
  'landing-agenda',
  'catalogo-web',
  'redes-sociales-mes',
]);

/** Producto que representa a cada categoría en Inicio. */
const CATEGORY_IMAGE: Record<string, string> = {
  impresos: 'tarjetas-de-presentacion',
  'gran-formato': 'lonas',
  promocionales: 'playeras',
  'identidad-de-marca': 'logotipo',
  digital: 'landing-page',
};

export function illustrationFor(slug: string): string | null {
  return ILLUSTRATED.has(slug) ? `/img/productos/${slug}.svg` : null;
}

/** Foto real del producto o, si no hay, su ilustración. */
export function productImage(slug: string, photo?: string | null): string | null {
  return photo || illustrationFor(slug);
}

export function categoryImage(categorySlug: string): string | null {
  const slug = CATEGORY_IMAGE[categorySlug];
  return slug ? illustrationFor(slug) : null;
}
