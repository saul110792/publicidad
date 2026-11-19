import type { Centavos } from './money';

export const SORT_OPTIONS = [
  { value: 'populares', label: 'Más pedidos' },
  { value: 'precio', label: 'Precio: menor a mayor' },
  { value: 'entrega', label: 'Entrega más rápida' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export type CategoryDTO = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  totalProductos: number;
};

export type ProductCardDTO = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  categoria: { slug: string; nombre: string };
  imagen: string | null;
  unidad: string;
  cantidadMinima: number | null;
  /** precio_base × cantidad mínima. NULL mientras no haya precio. */
  precioDesde: Centavos | null;
  tiempoEntregaDias: number | null;
  entregaRapida: boolean;
  incluyeDiseno: boolean;
};

export type PackageDTO = {
  slug: string;
  nombre: string;
  giro: string | null;
  descripcion: string | null;
  precio: Centavos | null;
  /** Suma de los componentes comprados por separado. NULL si falta algún precio. */
  precioSeparado: Centavos | null;
  destacado: boolean;
  recomendado: boolean;
  items: { etiqueta: string; productSlug: string }[];
};

export type ServiceDTO = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  precioMensual: Centavos | null;
};

export type HomeDTO = {
  categorias: CategoryDTO[];
  masPedidos: ProductCardDTO[];
  paquetesDestacados: PackageDTO[];
};
