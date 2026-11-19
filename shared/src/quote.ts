import type { Centavos } from './money';
import { formatMXN } from './money';
import type { PackageDTO, ProductCardDTO } from './catalog';

export type ModifierType = 'fijo' | 'porcentaje' | 'por_unidad';

export type OptionDTO = {
  id: number;
  label: string;
  /** NULL = costo por confirmar. */
  modificador: number | null;
  tipoModificador: ModifierType;
  valorCantidad: number | null;
  esDefault: boolean;
};

export type OptionGroupDTO = {
  id: number;
  nombre: string;
  clave: string;
  opciones: OptionDTO[];
};

export type ProductDetailDTO = Omit<ProductCardDTO, 'imagen'> & {
  imagenes: string[];
  grupos: OptionGroupDTO[];
  /** Paquete que incluye este producto, para el cross-sell. */
  paquete: PackageDTO | null;
};

/** groupId → optionId */
export type Selection = Record<string, number>;

export type QuoteRequest = { productSlug: string; opciones: Selection };

export type QuoteDTO = {
  cantidad: number;
  unidad: string;
  /** NULL mientras falte algún precio (base u opción elegida). */
  total: Centavos | null;
  precioUnitario: Centavos | null;
  /** Qué falta por definir para dar precio, ej. ["Precio base", "Papel: Opalina"]. */
  pendientes: string[];
  seleccion: { grupo: string; clave: string; opcion: string }[];
};

export type LeadRequest = QuoteRequest & {
  utm?: { source?: string; medium?: string; campaign?: string };
};

export type LeadDTO = { refCode: string; mensaje: string };

/** Mensaje prellenado de WhatsApp. Sin emojis, legible en cualquier teléfono. */
export function buildWhatsappMessage(input: {
  producto: string;
  seleccion: QuoteDTO['seleccion'];
  total: Centavos | null;
  refCode: string;
}): string {
  const lines = [
    'Hola, quiero cotizar:',
    `*${input.producto}*`,
    ...input.seleccion.map((s) => `- ${s.grupo}: ${s.opcion}`),
    `Precio estimado: ${input.total == null ? 'por confirmar' : formatMXN(input.total)}`,
    `Referencia: ${input.refCode}`,
  ];
  return lines.join('\n');
}
