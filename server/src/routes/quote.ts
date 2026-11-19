import { Router } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { buildWhatsappMessage, type LeadDTO, type ProductDetailDTO } from '@publicidad/shared';
import { db } from '../db/client';
import { categories, leads, packageItems, packages, products } from '../db/schema';
import { HttpError } from '../middleware/errors';
import { loadGroups, loadPricedProducts, quoteProduct } from '../services/catalogData';
import { QuoteError } from '../services/pricing';
import { parse, selectionSchema, slugSchema, utmSchema } from '../services/validation';
import { generateRefCode, isUniqueViolation } from '../services/refCode';
import { getPackages, productCardFields, toProductCard } from './catalog';

export const quoteRouter = Router();

// --- Carga de datos ---

async function loadProduct(slug: string) {
  const [row] = await db
    .select({
      ...productCardFields,
      id: products.id,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.activo, true)))
    .limit(1);
  if (!row) throw new HttpError(404, 'Producto no encontrado');
  return row;
}

/** Paquete para el cross-sell: el recomendado/destacado que incluya este producto. */
async function findCrossSellPackage(productId: number) {
  const [hit] = await db
    .select({ id: packages.id })
    .from(packageItems)
    .innerJoin(packages, eq(packages.id, packageItems.packageId))
    .where(and(eq(packageItems.productId, productId), eq(packages.activo, true)))
    .orderBy(desc(packages.recomendado), desc(packages.destacado), asc(packages.orden))
    .limit(1);
  if (!hit) return null;
  const [pkg] = await getPackages({ ids: [hit.id] });
  return pkg ?? null;
}

export async function quoteFor(slug: string, selection: Record<string, number>) {
  const product = (await loadPricedProducts({ slugs: [slug] })).get(slug);
  if (!product) throw new HttpError(404, 'Producto no encontrado');
  try {
    return { product, quote: quoteProduct(product, selection) };
  } catch (err) {
    if (err instanceof QuoteError) throw new HttpError(400, err.message);
    throw err;
  }
}

// --- Validación ---

const quoteBody = z.object({ productSlug: slugSchema, opciones: selectionSchema.default({}) });
const leadBody = quoteBody.extend({ utm: utmSchema });

// --- Rutas ---

quoteRouter.get('/products/:slug', async (req, res) => {
  const slug = parse(slugSchema, req.params.slug);
  const product = await loadProduct(slug);
  const [grupos, paquete] = await Promise.all([
    loadGroups([product.id]).then((m) => m.get(product.id) ?? []),
    findCrossSellPackage(product.id),
  ]);
  const { imagen: _imagen, ...card } = toProductCard(product);
  const body: ProductDetailDTO = { ...card, imagenes: product.imagenes, grupos, paquete };
  res.json(body);
});

quoteRouter.post('/quote', async (req, res) => {
  const { productSlug, opciones } = parse(quoteBody, req.body);
  const { quote } = await quoteFor(productSlug, opciones);
  res.json(quote);
});

/**
 * Crea un lead de WhatsApp con su ref_code y devuelve el mensaje prellenado.
 * El precio del mensaje lo recalcula el back, nunca se toma del front.
 */
quoteRouter.post('/leads', async (req, res) => {
  const { productSlug, opciones, utm } = parse(leadBody, req.body);
  const { product, quote } = await quoteFor(productSlug, opciones);

  for (let attempt = 0; attempt < 5; attempt++) {
    const refCode = generateRefCode(product.refPrefijo ?? product.slug);
    try {
      await db.insert(leads).values({
        refCode,
        productId: product.id,
        opciones: { seleccion: quote.seleccion, ids: opciones, total: quote.total },
        utmSource: utm?.source,
        utmMedium: utm?.medium,
        utmCampaign: utm?.campaign,
        canal: 'whatsapp',
      });
      const body: LeadDTO = {
        refCode,
        mensaje: buildWhatsappMessage({
          producto: product.nombre,
          seleccion: quote.seleccion,
          total: quote.total,
          refCode,
        }),
      };
      res.status(201).json(body);
      return;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new HttpError(503, 'No se pudo generar el código de referencia, intenta de nuevo');
});
