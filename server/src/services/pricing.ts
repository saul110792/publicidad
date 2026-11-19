/**
 * Motor de precios. Es la única fuente de verdad: el front solo muestra lo que devuelve.
 *
 *  1. Cantidad = opción del grupo "cantidad" (valor_cantidad) o la cantidad mínima, o 1.
 *  2. Precio unitario = escala más alta cuya cantidad sea ≤ la pedida; si no hay, precio_base.
 *  3. Subtotal = unitario × cantidad.
 *  4. Opciones: por_unidad suma modificador × cantidad; fijo suma una vez;
 *     porcentaje se aplica al final sobre todo lo anterior.
 *  5. Si falta cualquier precio (base u opción elegida) el total es NULL y se listan los pendientes.
 */
import type {
  Centavos,
  ModifierType,
  OptionGroupDTO,
  QuoteDTO,
  Selection,
} from '@publicidad/shared';

export class QuoteError extends Error {}

export type PricingProduct = {
  precioBase: Centavos | null;
  cantidadMinima: number | null;
  unidad: string;
};

export type PricingTier = { cantidad: number; precioUnitario: Centavos };

type Chosen = {
  grupo: OptionGroupDTO;
  opcion: OptionGroupDTO['opciones'][number];
};

/** Resuelve la selección del cliente; los grupos sin elegir toman su opción por defecto. */
export function resolveSelection(groups: OptionGroupDTO[], selection: Selection): Chosen[] {
  return groups.map((grupo) => {
    const wanted = selection[String(grupo.id)];
    if (wanted !== undefined) {
      const opcion = grupo.opciones.find((o) => o.id === wanted);
      if (!opcion) throw new QuoteError(`Opción inválida para ${grupo.nombre}`);
      return { grupo, opcion };
    }
    const opcion = grupo.opciones.find((o) => o.esDefault) ?? grupo.opciones[0];
    if (!opcion) throw new QuoteError(`El grupo ${grupo.nombre} no tiene opciones`);
    return { grupo, opcion };
  });
}

export function unitPriceFor(
  cantidad: number,
  precioBase: Centavos | null,
  tiers: PricingTier[],
): Centavos | null {
  const tier = [...tiers]
    .sort((a, b) => b.cantidad - a.cantidad)
    .find((t) => t.cantidad <= cantidad);
  return tier?.precioUnitario ?? precioBase;
}

export function computeQuote(
  product: PricingProduct,
  tiers: PricingTier[],
  chosen: Chosen[],
): QuoteDTO {
  const qtyChoice = chosen.find((c) => c.grupo.clave === 'cantidad');
  const cantidad = qtyChoice?.opcion.valorCantidad ?? product.cantidadMinima ?? 1;

  const pendientes: string[] = [];
  const unit = unitPriceFor(cantidad, product.precioBase, tiers);
  if (unit == null) pendientes.push('Precio base');

  let fijos = 0;
  let porUnidad = 0;
  let porcentaje = 0;
  for (const { grupo, opcion } of chosen) {
    if (opcion.modificador == null) {
      pendientes.push(`${grupo.nombre}: ${opcion.label}`);
      continue;
    }
    const type: ModifierType = opcion.tipoModificador;
    if (type === 'fijo') fijos += opcion.modificador;
    else if (type === 'por_unidad') porUnidad += opcion.modificador;
    else porcentaje += opcion.modificador;
  }

  const seleccion = chosen.map((c) => ({
    grupo: c.grupo.nombre,
    clave: c.grupo.clave,
    opcion: c.opcion.label,
  }));

  if (pendientes.length || unit == null) {
    return {
      cantidad,
      unidad: product.unidad,
      total: null,
      precioUnitario: null,
      pendientes,
      seleccion,
    };
  }

  const base = unit * cantidad + porUnidad * cantidad + fijos;
  const total = Math.max(0, Math.round(base * (1 + porcentaje / 100)));
  return {
    cantidad,
    unidad: product.unidad,
    total,
    precioUnitario: Math.round(total / cantidad),
    pendientes,
    seleccion,
  };
}
