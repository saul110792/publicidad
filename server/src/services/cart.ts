/**
 * Cotiza el carrito completo en el back y arma la oferta de paquete.
 * El front solo manda slugs y opciones; precios, nombres y la oferta salen de aquí.
 */
import {
  sumOrNull,
  type CartDTO,
  type CartLineDTO,
  type CartLineInput,
  type PackageOfferDTO,
} from '@publicidad/shared';
import { env } from '../config/env';
import {
  loadPackages,
  loadPricedProducts,
  quoteProduct,
  toPackageDTOs,
  type FullPackage,
} from './catalogData';
import { findBestOffer, mergeComponentSelection, type MatchLine } from './packageMatch';
import { sanitizeFile } from './uploads';

/** Línea cotizada con lo que se necesita para guardarla como `order_item`. */
export type PricedLine = CartLineDTO & {
  productId: number | null;
  packageId: number | null;
  precioUnitario: number | null;
  /** Lo que se guarda en `order_items.opciones`. */
  opcionesJson: Record<string, unknown>;
  desdeOferta: boolean;
};

function unavailable(line: CartLineInput): PricedLine {
  return {
    id: line.id,
    tipo: line.tipo,
    slug: line.tipo === 'producto' ? line.productSlug : line.packageSlug,
    nombre: 'Ya no está disponible',
    imagen: null,
    detalle: [],
    cantidad: 0,
    unidad: '',
    total: null,
    archivo: null,
    disponible: false,
    productId: null,
    packageId: null,
    precioUnitario: null,
    opcionesJson: {},
    desdeOferta: false,
  };
}

export async function priceLines(lines: CartLineInput[]): Promise<PricedLine[]> {
  const productSlugs = new Set<string>();
  const packageSlugs = new Set<string>();
  for (const l of lines) {
    if (l.tipo === 'producto') productSlugs.add(l.productSlug);
    else {
      packageSlugs.add(l.packageSlug);
      l.componentes.forEach((c) => productSlugs.add(c.productSlug));
    }
  }

  const [priced, pkgs] = await Promise.all([
    loadPricedProducts({ slugs: [...productSlugs] }),
    loadPackages({ slugs: [...packageSlugs] }),
  ]);
  const pkgBySlug = new Map(pkgs.map((p) => [p.slug, p]));

  return lines.map<PricedLine>((line) => {
    if (line.tipo === 'producto') {
      const p = priced.get(line.productSlug);
      if (!p) return unavailable(line);
      let quote;
      try {
        quote = quoteProduct(p, line.opciones);
      } catch {
        // Una opción que ya no existe (el admin la borró): se pide volver a cotizar.
        return unavailable(line);
      }
      const archivo = sanitizeFile(line.archivo);
      return {
        id: line.id,
        tipo: 'producto',
        slug: p.slug,
        nombre: p.nombre,
        imagen: p.imagenes[0] ?? null,
        detalle: quote.seleccion.map((s) => `${s.grupo}: ${s.opcion}`),
        cantidad: quote.cantidad,
        unidad: quote.unidad,
        total: quote.total,
        archivo,
        disponible: true,
        productId: p.id,
        packageId: null,
        precioUnitario: quote.precioUnitario,
        opcionesJson: {
          ids: line.opciones,
          seleccion: quote.seleccion,
          pendientes: quote.pendientes,
        },
        desdeOferta: false,
      };
    }

    const pkg = pkgBySlug.get(line.packageSlug);
    if (!pkg) return unavailable(line);

    // Opciones que el cliente ya había elegido para los productos que pasaron al paquete.
    const remaining = [...line.componentes];
    const componentes = pkg.items.map((item) => {
      const idx = remaining.findIndex((c) => c.productSlug === item.productSlug);
      const comp = idx >= 0 ? remaining.splice(idx, 1)[0] : undefined;
      const product = priced.get(item.productSlug);
      let seleccion = null;
      let ids = null;
      if (comp && product) {
        try {
          ids = mergeComponentSelection(product.grupos, item, comp.opciones);
          seleccion = quoteProduct(product, ids).seleccion;
        } catch {
          // Una opción que ya no existe: el componente toma las opciones del paquete.
          ids = null;
          seleccion = null;
        }
      }
      return {
        etiqueta: item.etiqueta,
        productSlug: item.productSlug,
        ids,
        seleccion,
        archivo: comp ? sanitizeFile(comp.archivo) : null,
      };
    });

    return {
      id: line.id,
      tipo: 'paquete',
      slug: pkg.slug,
      nombre: `Paquete ${pkg.nombre}`,
      imagen: null,
      detalle: componentes.map((c) =>
        c.seleccion ? `${c.etiqueta} (con tus opciones)` : c.etiqueta,
      ),
      cantidad: 1,
      unidad: 'paquete',
      total: pkg.precio,
      archivo: null,
      disponible: true,
      productId: null,
      packageId: pkg.id,
      precioUnitario: pkg.precio,
      opcionesJson: { componentes },
      desdeOferta: Boolean(line.desdeOferta),
    };
  });
}

/** Mejor paquete para las líneas sueltas del carrito, o NULL. */
export async function buildOffer(
  lines: PricedLine[],
  excluded: string[],
  allPackages?: FullPackage[],
): Promise<PackageOfferDTO | null> {
  const productLines: MatchLine[] = lines
    .filter((l) => l.disponible && l.tipo === 'producto')
    .map((l) => ({ id: l.id, productSlug: l.slug }));
  if (productLines.length < 2) return null;

  const pkgs = allPackages ?? (await loadPackages());
  const inCart = lines.filter((l) => l.tipo === 'paquete').map((l) => l.slug);
  const match = findBestOffer(productLines, pkgs, [...excluded, ...inCart]);
  if (!match) return null;

  const pkg = pkgs.find((p) => p.slug === match.slug)!;
  const [paquete] = await toPackageDTOs([pkg]);
  const byId = new Map(lines.map((l) => [l.id, l]));
  return {
    paquete: paquete!,
    cubiertos: match.covered.map(({ itemIndex, lineId }) => ({
      etiqueta: pkg.items[itemIndex]!.etiqueta,
      productSlug: pkg.items[itemIndex]!.productSlug,
      lineaId: lineId,
    })),
    faltantes: match.missing.map((i) => ({
      etiqueta: pkg.items[i]!.etiqueta,
      productSlug: pkg.items[i]!.productSlug,
    })),
    totalCubierto: sumOrNull(match.covered.map((c) => byId.get(c.lineId)?.total ?? null)),
  };
}

export function toLineDTO(l: PricedLine): CartLineDTO {
  return {
    id: l.id,
    tipo: l.tipo,
    slug: l.slug,
    nombre: l.nombre,
    imagen: l.imagen,
    detalle: l.detalle,
    cantidad: l.cantidad,
    unidad: l.unidad,
    total: l.total,
    archivo: l.archivo,
    disponible: l.disponible,
  };
}

export const shippingCost = (): number | null => env.SHIPPING_COST ?? null;

export async function quoteCart(lines: CartLineInput[], rechazadas: string[]): Promise<CartDTO> {
  const priced = await priceLines(lines);
  const available = priced.filter((l) => l.disponible);
  return {
    lineas: priced.map(toLineDTO),
    subtotal: available.length ? sumOrNull(available.map((l) => l.total)) : 0,
    oferta: await buildOffer(priced, rechazadas),
    envioDomicilio: shippingCost(),
  };
}
