import type { Centavos } from './money';
import type { PackageDTO } from './catalog';
import type { Selection } from './quote';
import type { Giro, Origen } from './constants';

/** Archivo de diseño ya subido al almacenamiento. */
export type CartFile = { url: string; nombre: string };

/** Producto que ya iba en el carrito y quedó dentro de un paquete, con sus opciones. */
export type PackageComponentInput = {
  productSlug: string;
  opciones: Selection;
  archivo?: CartFile | null;
};

/**
 * Lo que guarda el navegador. Solo identificadores y opciones: los precios y nombres
 * siempre los responde el back.
 */
export type CartLineInput =
  | {
      id: string;
      tipo: 'producto';
      productSlug: string;
      opciones: Selection;
      archivo?: CartFile | null;
    }
  | {
      id: string;
      tipo: 'paquete';
      packageSlug: string;
      componentes: PackageComponentInput[];
      /** true si entró al aceptar la oferta "Cambiar a paquete". */
      desdeOferta?: boolean;
    };

export type CartRequest = {
  lineas: CartLineInput[];
  /** Paquetes que el cliente ya rechazó: no se le vuelven a ofrecer. */
  ofertasRechazadas?: string[];
};

export type CartLineDTO = {
  id: string;
  tipo: 'producto' | 'paquete';
  slug: string;
  nombre: string;
  imagen: string | null;
  /** Renglones de detalle: "Cantidad: 500", o los componentes del paquete. */
  detalle: string[];
  cantidad: number;
  unidad: string;
  total: Centavos | null;
  archivo: CartFile | null;
  /** false si el producto o paquete ya no existe; el front lo quita. */
  disponible: boolean;
};

export type PackageOfferDTO = {
  paquete: PackageDTO;
  /** Componentes que ya lleva, con la línea del carrito que los cubre. */
  cubiertos: { etiqueta: string; productSlug: string; lineaId: string }[];
  faltantes: { etiqueta: string; productSlug: string }[];
  /** Lo que cuestan hoy las líneas cubiertas. NULL si falta algún precio. */
  totalCubierto: Centavos | null;
};

export type CartDTO = {
  lineas: CartLineDTO[];
  /** NULL si algún precio está por confirmar. */
  subtotal: Centavos | null;
  oferta: PackageOfferDTO | null;
  /** Costo del envío a domicilio. NULL = por confirmar. */
  envioDomicilio: Centavos | null;
};

export const DELIVERY_METHODS = [
  { value: 'recoger', label: 'Recoger en tienda', nota: 'Sin costo' },
  { value: 'domicilio', label: 'Envío a domicilio', nota: null },
] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]['value'];

export const PAYMENT_METHODS = [
  { value: 'tarjeta', label: 'Tarjeta de crédito o débito', nota: 'Pago en línea' },
  { value: 'transferencia', label: 'Transferencia / SPEI', nota: 'Te mandamos los datos' },
  { value: 'tienda', label: 'Pago en tienda', nota: '50% de anticipo para empezar' },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export type OrderRequest = {
  lineas: CartLineInput[];
  cliente: { nombre: string; whatsapp: string; correo?: string; giro?: Giro | '' };
  entrega: DeliveryMethod;
  direccion?: string;
  metodoPago: PaymentMethod;
  comoNosConocio?: Origen | '';
  utm?: { source?: string; medium?: string; campaign?: string };
};

export type OrderCreatedDTO = { folio: string };

export type OrderDTO = {
  folio: string;
  /** Solo el primer nombre: la página es pública para quien tenga el folio. */
  nombre: string;
  createdAt: string;
  lineas: CartLineDTO[];
  subtotal: Centavos | null;
  envio: Centavos | null;
  total: Centavos | null;
  /** 50% del total si paga en tienda. */
  anticipo: Centavos | null;
  metodoPago: PaymentMethod;
  entrega: DeliveryMethod;
  estado: string;
  estadoPago: string;
  packageUpgrade: boolean;
  /** Oferta después de la compra: paquete que completa lo que compró. */
  oferta: PackageOfferDTO | null;
};

/** 50% redondeado hacia arriba al peso. */
export function anticipoDe(total: Centavos | null): Centavos | null {
  if (total == null) return null;
  return Math.ceil(total / 2 / 100) * 100;
}

/** Suma que se vuelve NULL si cualquiera de los valores es NULL. */
export function sumOrNull(values: (Centavos | null)[]): Centavos | null {
  let total = 0;
  for (const v of values) {
    if (v == null) return null;
    total += v;
  }
  return total;
}
