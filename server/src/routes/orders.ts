import { Router } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  anticipoDe,
  DELIVERY_METHODS,
  GIROS,
  ORIGENES,
  PAYMENT_METHODS,
  sumOrNull,
  type CartDTO,
  type CartLineDTO,
  type OrderCreatedDTO,
  type OrderDTO,
} from '@publicidad/shared';
import { db } from '../db/client';
import { customers, orderItems, orders, packages, products } from '../db/schema';
import { HttpError } from '../middleware/errors';
import { buildOffer, priceLines, quoteCart, shippingCost } from '../services/cart';
import { FOLIO_PATTERN, generateFolio } from '../services/folio';
import { canPayOnline, startCheckout } from '../services/payments';
import { isUniqueViolation } from '../services/refCode';
import { cloudinary, uploadSignature } from '../services/uploads';
import { parse, selectionSchema, slugSchema, utmSchema } from '../services/validation';

export const ordersRouter = Router();

// --- Validación ---

const fileSchema = z
  .object({ url: z.url().max(500), nombre: z.string().trim().min(1).max(200) })
  .nullish();

const lineId = z.string().regex(/^[\w-]{1,40}$/);

const lineSchema = z.discriminatedUnion('tipo', [
  z.object({
    id: lineId,
    tipo: z.literal('producto'),
    productSlug: slugSchema,
    opciones: selectionSchema.default({}),
    archivo: fileSchema,
  }),
  z.object({
    id: lineId,
    tipo: z.literal('paquete'),
    packageSlug: slugSchema,
    componentes: z
      .array(
        z.object({
          productSlug: slugSchema,
          opciones: selectionSchema.default({}),
          archivo: fileSchema,
        }),
      )
      .max(20)
      .default([]),
    desdeOferta: z.boolean().optional(),
  }),
]);

const linesSchema = z
  .array(lineSchema)
  .max(30)
  .refine((ls) => new Set(ls.map((l) => l.id)).size === ls.length);

const cartBody = z.object({
  lineas: linesSchema,
  ofertasRechazadas: z.array(slugSchema).max(20).default([]),
});

const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((x) => x.value) as unknown as [T[number]['value'], ...T[number]['value'][]];

const optionalEnum = <T extends readonly { value: string }[]>(list: T) =>
  z
    .enum(values(list))
    .or(z.literal(''))
    .optional()
    .transform((v) => v || null);

const orderBody = z
  .object({
    lineas: linesSchema.refine((ls) => ls.length > 0),
    cliente: z.object({
      nombre: z.string().trim().min(2).max(120),
      // 10 dígitos (MX) o con lada de país: 52 / 521 + 10 dígitos.
      whatsapp: z
        .string()
        .transform((v) => v.replace(/\D/g, ''))
        .pipe(z.string().regex(/^(52(1)?)?\d{10}$/)),
      correo: z
        .email()
        .max(200)
        .or(z.literal(''))
        .optional()
        .transform((v) => v || null),
      giro: optionalEnum(GIROS),
    }),
    entrega: z.enum(values(DELIVERY_METHODS)),
    direccion: z.string().trim().max(500).optional(),
    metodoPago: z.enum(values(PAYMENT_METHODS)),
    comoNosConocio: optionalEnum(ORIGENES),
    utm: utmSchema,
  })
  .refine((o) => o.entrega !== 'domicilio' || (o.direccion?.length ?? 0) >= 10, {
    path: ['direccion'],
  });

/** Guarda el WhatsApp como 10 dígitos para que el mismo cliente no se duplique. */
export function normalizeWhatsapp(digits: string): string {
  return digits.slice(-10);
}

// --- Rutas ---

ordersRouter.post('/cart', async (req, res) => {
  const { lineas, ofertasRechazadas } = parse(cartBody, req.body);
  const body: CartDTO = await quoteCart(lineas, ofertasRechazadas);
  res.json(body);
});

ordersRouter.post('/uploads/firma', (_req, res) => {
  if (!cloudinary) {
    throw new HttpError(
      503,
      'La subida de archivos no está disponible. Mándanos tu archivo por WhatsApp.',
    );
  }
  res.json(uploadSignature(cloudinary));
});

/**
 * Crea el pedido. Todo se recalcula aquí: los precios del front no se usan.
 * Si falta algún precio, el pedido se guarda con total NULL ("por confirmar") y el
 * negocio lo cotiza por WhatsApp antes de cobrar.
 */
ordersRouter.post('/orders', async (req, res) => {
  const input = parse(orderBody, req.body);
  const lines = await priceLines(input.lineas);
  if (lines.some((l) => !l.disponible)) {
    throw new HttpError(409, 'Algunos productos del carrito ya no están disponibles.');
  }

  const subtotal = sumOrNull(lines.map((l) => l.total));
  const envio = input.entrega === 'recoger' ? 0 : shippingCost();
  const total = sumOrNull([subtotal, envio]);
  const whatsapp = normalizeWhatsapp(input.cliente.whatsapp);

  const folio = await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({
        nombre: input.cliente.nombre,
        whatsapp,
        correo: input.cliente.correo,
        giro: input.cliente.giro,
        origen: input.comoNosConocio,
      })
      .onConflictDoUpdate({
        target: customers.whatsapp,
        set: {
          nombre: input.cliente.nombre,
          correo: sql`coalesce(excluded.correo, ${customers.correo})`,
          giro: sql`coalesce(excluded.giro, ${customers.giro})`,
          origen: sql`coalesce(${customers.origen}, excluded.origen)`,
        },
      })
      .returning({ id: customers.id });

    for (let attempt = 0; attempt < 5; attempt++) {
      const folio = generateFolio();
      try {
        // Savepoint: si el folio choca, solo se revierte este intento.
        return await tx.transaction(async (sp) => {
          const [order] = await sp
            .insert(orders)
            .values({
              folio,
              customerId: customer!.id,
              subtotal,
              envio,
              total,
              metodoPago: input.metodoPago,
              entrega: input.entrega,
              direccion: input.entrega === 'domicilio' ? input.direccion : null,
              comoNosConocio: input.comoNosConocio,
              utmSource: input.utm?.source,
              utmMedium: input.utm?.medium,
              utmCampaign: input.utm?.campaign,
              packageUpgrade: lines.some((l) => l.desdeOferta),
            })
            .returning({ id: orders.id });

          await sp.insert(orderItems).values(
            lines.map((l) => ({
              orderId: order!.id,
              tipo: l.tipo,
              productId: l.productId,
              packageId: l.packageId,
              opciones: { nombre: l.nombre, detalle: l.detalle, ...l.opcionesJson },
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
              total: l.total,
              archivoUrl: l.archivo?.url ?? null,
            })),
          );
          return folio;
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
      }
    }
    throw new HttpError(503, 'No pudimos generar el folio, intenta de nuevo.');
  });

  // Con tarjeta y total definido se crea el checkout. Si falla, el pedido ya existe y la
  // confirmación ofrece "Pagar ahora" para reintentar.
  let pagoUrl: string | null = null;
  if (canPayOnline({ metodoPago: input.metodoPago, total, estadoPago: 'pendiente' })) {
    try {
      pagoUrl = await startCheckout(folio);
    } catch (err) {
      console.error(`No se pudo crear el pago de ${folio}:`, err);
    }
  }

  const body: OrderCreatedDTO = { folio, pagoUrl };
  res.status(201).json(body);
});

ordersRouter.get('/orders/:folio', async (req, res) => {
  const folio = parse(z.string().regex(FOLIO_PATTERN), req.params.folio);
  const [order] = await db
    .select({ order: orders, nombre: customers.nombre })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.folio, folio))
    .limit(1);
  if (!order) throw new HttpError(404, 'Pedido no encontrado');
  const items = await db
    .select({ item: orderItems, productSlug: products.slug, packageSlug: packages.slug })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(packages, eq(packages.id, orderItems.packageId))
    .where(eq(orderItems.orderId, order.order.id))
    .orderBy(asc(orderItems.id));

  const lineas: CartLineDTO[] = items.map(({ item: it, productSlug, packageSlug }) => {
    const op = it.opciones as { nombre?: string; detalle?: string[] };
    return {
      id: String(it.id),
      tipo: it.tipo,
      slug: productSlug ?? packageSlug ?? '',
      nombre: op.nombre ?? '',
      imagen: null,
      detalle: op.detalle ?? [],
      cantidad: it.cantidad,
      unidad: it.tipo === 'paquete' ? 'paquete' : '',
      total: it.total,
      archivo: it.archivoUrl ? { url: it.archivoUrl, nombre: 'Archivo de diseño' } : null,
      disponible: true,
    };
  });

  // Oferta después de la compra: si compró piezas sueltas que encajan en un paquete.
  let oferta = null;
  if (!items.some(({ item }) => item.tipo === 'paquete')) {
    const priced = await priceLines(
      items
        .filter((r) => r.productSlug != null)
        .map(({ item, productSlug }) => ({
          id: String(item.id),
          tipo: 'producto' as const,
          productSlug: productSlug!,
          opciones: (item.opciones as { ids?: Record<string, number> }).ids ?? {},
        })),
    );
    oferta = await buildOffer(priced, []);
  }

  const o = order.order;
  const body: OrderDTO = {
    folio: o.folio,
    nombre: order.nombre.split(/\s+/)[0] ?? '',
    createdAt: o.createdAt.toISOString(),
    lineas,
    subtotal: o.subtotal,
    envio: o.envio,
    total: o.total,
    anticipo: o.metodoPago === 'tienda' ? anticipoDe(o.total) : null,
    metodoPago: o.metodoPago,
    entrega: o.entrega,
    estado: o.estado,
    estadoPago: o.estadoPago,
    pagoEnLinea: canPayOnline(o),
    packageUpgrade: o.packageUpgrade,
    oferta,
  };
  res.json(body);
});
