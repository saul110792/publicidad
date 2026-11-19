/**
 * Carga en lote lo necesario para cotizar: productos, grupos de opciones, escalas y paquetes.
 * Lo usan el cotizador, el carrito, los pedidos y el "precio por separado" de los paquetes.
 */
import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import {
  sumOrNull,
  type OptionGroupDTO,
  type PackageDTO,
  type QuoteDTO,
  type Selection,
} from '@publicidad/shared';
import { db } from '../db/client';
import { optionGroups, options, packageItems, packages, priceTiers, products } from '../db/schema';
import { packageItemSelection } from './packageMatch';
import { computeQuote, resolveSelection, type PricingTier } from './pricing';

export type PricedProduct = {
  id: number;
  slug: string;
  nombre: string;
  imagenes: string[];
  unidad: string;
  cantidadMinima: number | null;
  precioBase: number | null;
  refPrefijo: string | null;
  grupos: OptionGroupDTO[];
  tiers: PricingTier[];
};

export async function loadGroups(productIds: number[]): Promise<Map<number, OptionGroupDTO[]>> {
  const out = new Map<number, OptionGroupDTO[]>();
  if (!productIds.length) return out;
  const groups = await db
    .select()
    .from(optionGroups)
    .where(inArray(optionGroups.productId, productIds))
    .orderBy(asc(optionGroups.orden), asc(optionGroups.id));
  const opts = groups.length
    ? await db
        .select()
        .from(options)
        .where(
          inArray(
            options.groupId,
            groups.map((g) => g.id),
          ),
        )
        .orderBy(asc(options.orden), asc(options.id))
    : [];

  for (const g of groups) {
    const list = out.get(g.productId) ?? [];
    list.push({
      id: g.id,
      nombre: g.nombre,
      clave: g.clave,
      opciones: opts
        .filter((o) => o.groupId === g.id)
        .map((o) => ({
          id: o.id,
          label: o.label,
          modificador: o.modificador,
          tipoModificador: o.tipoModificador,
          valorCantidad: o.valorCantidad,
          esDefault: o.esDefault,
        })),
    });
    out.set(g.productId, list);
  }
  return out;
}

/** Productos activos con todo lo necesario para cotizar, indexados por slug. */
export async function loadPricedProducts(
  by: { slugs: string[] } | { ids: number[] },
): Promise<Map<string, PricedProduct>> {
  const list = 'slugs' in by ? by.slugs : by.ids;
  const out = new Map<string, PricedProduct>();
  if (!list.length) return out;

  const cond: SQL = 'slugs' in by ? inArray(products.slug, by.slugs) : inArray(products.id, by.ids);
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      nombre: products.nombre,
      imagenes: products.imagenes,
      unidad: products.unidad,
      cantidadMinima: products.cantidadMinima,
      precioBase: products.precioBase,
      refPrefijo: products.refPrefijo,
    })
    .from(products)
    .where(and(cond, eq(products.activo, true)));
  if (!rows.length) return out;

  const ids = rows.map((r) => r.id);
  const [groups, tiers] = await Promise.all([
    loadGroups(ids),
    db
      .select({
        productId: priceTiers.productId,
        cantidad: priceTiers.cantidad,
        precioUnitario: priceTiers.precioUnitario,
      })
      .from(priceTiers)
      .where(inArray(priceTiers.productId, ids)),
  ]);

  for (const r of rows) {
    out.set(r.slug, {
      ...r,
      grupos: groups.get(r.id) ?? [],
      tiers: tiers.filter((t) => t.productId === r.id),
    });
  }
  return out;
}

/** Cotiza un producto ya cargado. Lanza QuoteError si la selección no es válida. */
export function quoteProduct(p: PricedProduct, selection: Selection): QuoteDTO {
  return computeQuote(p, p.tiers, resolveSelection(p.grupos, selection));
}

export type PackageItemRow = {
  productId: number;
  productSlug: string;
  etiqueta: string;
  cantidad: number | null;
  opcionesDefault: unknown;
};

export type FullPackage = {
  id: number;
  slug: string;
  nombre: string;
  giro: string | null;
  descripcion: string | null;
  precio: number | null;
  destacado: boolean;
  recomendado: boolean;
  orden: number;
  items: PackageItemRow[];
};

export async function loadPackages(
  opts: { conds?: SQL[]; slugs?: string[]; ids?: number[] } = {},
): Promise<FullPackage[]> {
  const conds: SQL[] = [eq(packages.activo, true), ...(opts.conds ?? [])];
  if (opts.slugs) conds.push(inArray(packages.slug, opts.slugs.length ? opts.slugs : ['']));
  if (opts.ids) conds.push(inArray(packages.id, opts.ids.length ? opts.ids : [-1]));

  const pkgs = await db
    .select()
    .from(packages)
    .where(and(...conds))
    .orderBy(asc(packages.orden), asc(packages.id));
  if (!pkgs.length) return [];

  const items = await db
    .select({
      packageId: packageItems.packageId,
      productId: packageItems.productId,
      productSlug: products.slug,
      etiqueta: packageItems.etiqueta,
      cantidad: packageItems.cantidad,
      opcionesDefault: packageItems.opcionesDefault,
    })
    .from(packageItems)
    .innerJoin(products, eq(products.id, packageItems.productId))
    .where(
      inArray(
        packageItems.packageId,
        pkgs.map((p) => p.id),
      ),
    )
    .orderBy(asc(packageItems.orden), asc(packageItems.id));

  return pkgs.map((p) => ({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    giro: p.giro,
    descripcion: p.descripcion,
    precio: p.precio,
    destacado: p.destacado,
    recomendado: p.recomendado,
    orden: p.orden,
    items: items.filter((i) => i.packageId === p.id).map(({ packageId: _p, ...i }) => i),
  }));
}

/** Cotización de un componente del paquete con sus opciones por defecto. */
export function quotePackageItem(item: PackageItemRow, product: PricedProduct | undefined) {
  if (!product) return null;
  try {
    return quoteProduct(product, packageItemSelection(product.grupos, item));
  } catch {
    return null;
  }
}

/**
 * Convierte paquetes a DTO. "Por separado" = suma de cada componente cotizado con el motor
 * de precios real; NULL si falta cualquier precio.
 */
export async function toPackageDTOs(pkgs: FullPackage[]): Promise<PackageDTO[]> {
  const productIds = [...new Set(pkgs.flatMap((p) => p.items.map((i) => i.productId)))];
  const priced = await loadPricedProducts({ ids: productIds });

  return pkgs.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    giro: p.giro,
    descripcion: p.descripcion,
    precio: p.precio,
    precioSeparado: p.items.length
      ? sumOrNull(p.items.map((i) => quotePackageItem(i, priced.get(i.productSlug))?.total ?? null))
      : null,
    destacado: p.destacado,
    recomendado: p.recomendado,
    items: p.items.map((i) => ({ etiqueta: i.etiqueta, productSlug: i.productSlug })),
  }));
}
