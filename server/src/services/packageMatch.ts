/**
 * Coincidencia de paquetes: revisa los productos del carrito contra los componentes
 * de cada paquete y elige la mejor oferta.
 *
 *  - Cada línea del carrito cubre como máximo un componente (y viceversa).
 *  - Se ofrece un paquete solo si cubre ≥ MIN_COVERED componentes.
 *  - No se ofrecen paquetes que ya van en el carrito ni los que el cliente rechazó.
 *  - Desempate: más componentes cubiertos → mayor proporción cubierta (el paquete más
 *    "cercano" a lo que lleva) → recomendado → orden del catálogo.
 */
import type { OptionGroupDTO, Selection } from '@publicidad/shared';

export const MIN_COVERED = 2;

export type MatchLine = { id: string; productSlug: string };

export type MatchPackage = {
  slug: string;
  recomendado: boolean;
  orden: number;
  items: { productSlug: string; etiqueta: string }[];
};

export type PackageMatch = {
  slug: string;
  /** índice del componente → id de la línea que lo cubre */
  covered: { itemIndex: number; lineId: string }[];
  missing: number[];
};

export function matchPackage(lines: MatchLine[], pkg: MatchPackage): PackageMatch {
  const used = new Set<string>();
  const covered: PackageMatch['covered'] = [];
  const missing: number[] = [];
  pkg.items.forEach((item, itemIndex) => {
    const line = lines.find((l) => !used.has(l.id) && l.productSlug === item.productSlug);
    if (line) {
      used.add(line.id);
      covered.push({ itemIndex, lineId: line.id });
    } else {
      missing.push(itemIndex);
    }
  });
  return { slug: pkg.slug, covered, missing };
}

export function findBestOffer(
  lines: MatchLine[],
  pkgs: MatchPackage[],
  excluded: Iterable<string> = [],
): PackageMatch | null {
  const skip = new Set(excluded);
  let best: { match: PackageMatch; pkg: MatchPackage } | null = null;

  for (const pkg of pkgs) {
    if (skip.has(pkg.slug) || !pkg.items.length) continue;
    const match = matchPackage(lines, pkg);
    if (match.covered.length < MIN_COVERED) continue;
    if (!best || isBetter(match, pkg, best.match, best.pkg)) best = { match, pkg };
  }
  return best?.match ?? null;
}

function isBetter(a: PackageMatch, pa: MatchPackage, b: PackageMatch, pb: MatchPackage) {
  if (a.covered.length !== b.covered.length) return a.covered.length > b.covered.length;
  const ra = a.covered.length / pa.items.length;
  const rb = b.covered.length / pb.items.length;
  if (ra !== rb) return ra > rb;
  if (pa.recomendado !== pb.recomendado) return pa.recomendado;
  return pa.orden < pb.orden;
}

/**
 * Selección por defecto de un componente de paquete:
 *  - grupo "cantidad": la opción cuyo valor coincide con la cantidad del componente;
 *  - otros grupos: la opción cuyo texto coincide con `opciones_default[clave]`;
 *  - lo demás: la opción por defecto del grupo (la resuelve el motor de precios).
 */
export function packageItemSelection(
  groups: OptionGroupDTO[],
  item: { cantidad: number | null; opcionesDefault: unknown },
): Selection {
  const defaults =
    item.opcionesDefault && typeof item.opcionesDefault === 'object'
      ? (item.opcionesDefault as Record<string, unknown>)
      : {};
  const sel: Selection = {};
  for (const g of groups) {
    const wanted = defaults[g.clave];
    let opt =
      typeof wanted === 'string'
        ? g.opciones.find((o) => o.label.toLowerCase() === wanted.toLowerCase())
        : undefined;
    if (!opt && g.clave === 'cantidad' && item.cantidad != null) {
      opt = g.opciones.find((o) => o.valorCantidad === item.cantidad);
    }
    if (opt) sel[String(g.id)] = opt.id;
  }
  return sel;
}

/**
 * Opciones de un producto que pasó al paquete: lo que define el paquete (cantidad y
 * opciones_default, ej. "Lona 2×1 m") se respeta; en lo demás (papel, acabado, diseño…)
 * se conserva lo que eligió el cliente. La cantidad del cliente nunca se usa.
 */
export function mergeComponentSelection(
  groups: OptionGroupDTO[],
  item: { cantidad: number | null; opcionesDefault: unknown },
  customer: Selection,
): Selection {
  const sel = packageItemSelection(groups, item);
  for (const g of groups) {
    const key = String(g.id);
    if (g.clave === 'cantidad' || sel[key] !== undefined || customer[key] === undefined) continue;
    sel[key] = customer[key];
  }
  return sel;
}
