import { Router } from 'express';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  buildWhatsappMessage,
  type LeadDTO,
  type OptionGroupDTO,
  type ProductDetailDTO,
} from '@publicidad/shared';
import { db } from '../db/client';
import {
  categories,
  leads,
  optionGroups,
  options,
  packageItems,
  packages,
  priceTiers,
  products,
} from '../db/schema';
import { HttpError } from '../middleware/errors';
import { computeQuote, QuoteError, resolveSelection } from '../services/pricing';
import { generateRefCode, isUniqueViolation } from '../services/refCode';
import { getPackages, productCardFields, toProductCard } from './catalog';

export const quoteRouter = Router();

// --- Carga de datos ---

async function loadProduct(slug: string) {
  const [row] = await db
    .select({
      ...productCardFields,
      id: products.id,
      refPrefijo: products.refPrefijo,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.activo, true)))
    .limit(1);
  if (!row) throw new HttpError(404, 'Producto no encontrado');
  return row;
}

async function loadGroups(productId: number): Promise<OptionGroupDTO[]> {
  const groups = await db
    .select()
    .from(optionGroups)
    .where(eq(optionGroups.productId, productId))
    .orderBy(asc(optionGroups.orden));
  if (!groups.length) return [];

  const opts = await db
    .select()
    .from(options)
    .where(
      inArray(
        options.groupId,
        groups.map((g) => g.id),
      ),
    )
    .orderBy(asc(options.orden));

  return groups.map((g) => ({
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
  }));
}

async function loadTiers(productId: number) {
  return db
    .select({ cantidad: priceTiers.cantidad, precioUnitario: priceTiers.precioUnitario })
    .from(priceTiers)
    .where(eq(priceTiers.productId, productId));
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

async function quoteFor(slug: string, selection: Record<string, number>) {
  const product = await loadProduct(slug);
  const [groups, tiers] = await Promise.all([loadGroups(product.id), loadTiers(product.id)]);
  try {
    const chosen = resolveSelection(groups, selection);
    return { product, quote: computeQuote(product, tiers, chosen) };
  } catch (err) {
    if (err instanceof QuoteError) throw new HttpError(400, err.message);
    throw err;
  }
}

// --- Validación ---

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const selectionSchema = z.record(z.string().regex(/^\d+$/), z.number().int().positive());
const quoteBody = z.object({ productSlug: slugSchema, opciones: selectionSchema.default({}) });
const utmField = z.string().trim().max(100).optional();
const leadBody = quoteBody.extend({
  utm: z.object({ source: utmField, medium: utmField, campaign: utmField }).optional(),
});

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, 'Datos inválidos');
  return r.data;
}

// --- Rutas ---

quoteRouter.get('/products/:slug', async (req, res) => {
  const slug = parse(slugSchema, req.params.slug);
  const product = await loadProduct(slug);
  const [grupos, paquete] = await Promise.all([
    loadGroups(product.id),
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
