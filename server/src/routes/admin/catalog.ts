import { Router } from 'express';
import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  GIROS,
  type AdminCategory,
  type AdminPackage,
  type AdminProduct,
  type AdminProductRow,
  type AdminService,
} from '@publicidad/shared';
import { db } from '../../db/client';
import {
  categories,
  optionGroups,
  options,
  orderItems,
  packageItems,
  packages,
  priceTiers,
  products,
  recurringServices,
} from '../../db/schema';
import { HttpError } from '../../middleware/errors';
import { isUniqueViolation } from '../../services/refCode';
import { parse } from '../../services/validation';

export const adminCatalogRouter = Router();

// --- Validación ---

const id = z.coerce.number().int().positive();
const slug = z.string().regex(/^[a-z0-9-]{1,80}$/, 'Slug: minúsculas, números y guiones');
const money = z.number().int().min(0).max(100_000_000).nullable();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v || null);
const giro = z.enum(GIROS.map((g) => g.value) as [string, ...string[]]);

const categorySchema = z.object({
  slug,
  nombre: z.string().trim().min(1).max(80),
  descripcion: text(300),
  orden: z.number().int().default(0),
});

const optionSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().trim().min(1).max(80),
  // Centavos (fijo / por_unidad) o puntos porcentuales (porcentaje, puede ser negativo).
  modificador: z.number().int().min(-100_000_000).max(100_000_000).nullable(),
  tipoModificador: z.enum(['fijo', 'porcentaje', 'por_unidad']),
  valorCantidad: z.number().int().positive().nullable(),
  esDefault: z.boolean(),
});

const groupSchema = z.object({
  id: z.number().int().positive().optional(),
  nombre: z.string().trim().min(1).max(60),
  clave: z.string().regex(/^[a-z0-9_]{1,30}$/),
  opciones: z.array(optionSchema).min(1).max(30),
});

const productSchema = z.object({
  slug,
  categoryId: z.number().int().positive(),
  nombre: z.string().trim().min(1).max(120),
  descripcion: text(1000),
  imagenes: z.array(z.url().max(500)).max(10).default([]),
  precioBase: money,
  unidad: z.string().trim().min(1).max(20),
  cantidadMinima: z.number().int().positive().nullable(),
  tiempoEntregaDias: z.number().int().min(0).max(365).nullable(),
  entregaRapida: z.boolean(),
  incluyeDiseno: z.boolean(),
  activo: z.boolean(),
  giros: z.array(giro).max(GIROS.length).default([]),
  popularidad: z.number().int().min(0).max(1_000_000).default(0),
  refPrefijo: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{0,2}$/)
    .nullable()
    .transform((v) => (v ? v.toUpperCase() : null)),
  grupos: z.array(groupSchema).max(10).default([]),
  tiers: z
    .array(
      z.object({ cantidad: z.number().int().positive(), precioUnitario: z.number().int().min(0) }),
    )
    .max(20)
    .default([])
    .refine((t) => new Set(t.map((x) => x.cantidad)).size === t.length, {
      message: 'Las escalas no pueden repetir cantidad',
    }),
});

const packageSchema = z.object({
  slug,
  nombre: z.string().trim().min(1).max(80),
  giro: giro.nullable(),
  descripcion: text(500),
  precio: money,
  destacado: z.boolean(),
  recomendado: z.boolean(),
  activo: z.boolean(),
  orden: z.number().int().default(0),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        etiqueta: z.string().trim().min(1).max(80),
        cantidad: z.number().int().positive().nullable(),
        opcionesDefault: z.record(z.string().max(30), z.string().max(80)).default({}),
      }),
    )
    .min(1)
    .max(20),
});

const serviceSchema = z.object({
  slug,
  nombre: z.string().trim().min(1).max(80),
  descripcion: text(500),
  precioMensual: money,
  orden: z.number().int().default(0),
});

/** Convierte errores de unicidad (slug repetido) en un 409 entendible. */
async function uniqueOr409<T>(fn: () => Promise<T>, what = 'slug'): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isUniqueViolation(err))
      throw new HttpError(409, `Ya existe otro registro con ese ${what}.`);
    throw err;
  }
}

function zodMessage(schema: z.ZodType, data: unknown) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  throw new HttpError(400, issue ? `${issue.path.join('.')}: ${issue.message}` : 'Datos inválidos');
}

// --- Categorías ---

adminCatalogRouter.get('/categories', async (_req, res) => {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nombre: categories.nombre,
      descripcion: categories.descripcion,
      orden: categories.orden,
      totalProductos: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.orden), asc(categories.id));
  res.json(rows satisfies AdminCategory[]);
});

adminCatalogRouter.post('/categories', async (req, res) => {
  const data = zodMessage(categorySchema, req.body) as z.infer<typeof categorySchema>;
  const [row] = await uniqueOr409(() => db.insert(categories).values(data).returning());
  res.status(201).json(row);
});

adminCatalogRouter.put('/categories/:id', async (req, res) => {
  const catId = parse(id, req.params.id);
  const data = zodMessage(categorySchema, req.body) as z.infer<typeof categorySchema>;
  const [row] = await uniqueOr409(() =>
    db.update(categories).set(data).where(eq(categories.id, catId)).returning(),
  );
  if (!row) throw new HttpError(404, 'Categoría no encontrada');
  res.json(row);
});

adminCatalogRouter.delete('/categories/:id', async (req, res) => {
  const catId = parse(id, req.params.id);
  const [used] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, catId));
  if (used && used.n > 0) {
    throw new HttpError(409, 'La categoría tiene productos: muévelos o desactívalos primero.');
  }
  await db.delete(categories).where(eq(categories.id, catId));
  res.status(204).end();
});

// --- Productos ---

adminCatalogRouter.get('/products', async (_req, res) => {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      categoryId: products.categoryId,
      categoria: categories.nombre,
      nombre: products.nombre,
      descripcion: products.descripcion,
      imagenes: products.imagenes,
      precioBase: products.precioBase,
      unidad: products.unidad,
      cantidadMinima: products.cantidadMinima,
      tiempoEntregaDias: products.tiempoEntregaDias,
      entregaRapida: products.entregaRapida,
      incluyeDiseno: products.incluyeDiseno,
      activo: products.activo,
      giros: products.giros,
      popularidad: products.popularidad,
      refPrefijo: products.refPrefijo,
      opcionesSinPrecio: sql<number>`(
        select count(*)::int from ${options} o
        join ${optionGroups} g on g.id = o.group_id
        where g.product_id = ${products.id} and o.modificador is null
      )`,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .orderBy(asc(categories.orden), asc(products.nombre));
  res.json(rows satisfies AdminProductRow[]);
});

adminCatalogRouter.get('/products/:id', async (req, res) => {
  const productId = parse(id, req.params.id);
  const [p] = await db.select().from(products).where(eq(products.id, productId));
  if (!p) throw new HttpError(404, 'Producto no encontrado');
  const groups = await db
    .select()
    .from(optionGroups)
    .where(eq(optionGroups.productId, productId))
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
  const tiers = await db
    .select({ cantidad: priceTiers.cantidad, precioUnitario: priceTiers.precioUnitario })
    .from(priceTiers)
    .where(eq(priceTiers.productId, productId))
    .orderBy(asc(priceTiers.cantidad));

  const body: AdminProduct = {
    id: p.id,
    slug: p.slug,
    categoryId: p.categoryId,
    nombre: p.nombre,
    descripcion: p.descripcion,
    imagenes: p.imagenes,
    precioBase: p.precioBase,
    unidad: p.unidad,
    cantidadMinima: p.cantidadMinima,
    tiempoEntregaDias: p.tiempoEntregaDias,
    entregaRapida: p.entregaRapida,
    incluyeDiseno: p.incluyeDiseno,
    activo: p.activo,
    giros: p.giros,
    popularidad: p.popularidad,
    refPrefijo: p.refPrefijo,
    grupos: groups.map((g) => ({
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
    })),
    tiers,
  };
  res.json(body);
});

type ProductInput = z.infer<typeof productSchema>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Sincroniza grupos, opciones y escalas: actualiza los que traen id, crea los nuevos y borra
 * los que ya no vienen. Así no cambian los ids de las opciones que siguen existiendo (los
 * carritos abiertos de los clientes las referencian).
 */
async function syncNested(tx: Tx, productId: number, input: ProductInput) {
  const existingGroups = await tx
    .select({ id: optionGroups.id })
    .from(optionGroups)
    .where(eq(optionGroups.productId, productId));
  const ownGroupIds = new Set(existingGroups.map((g) => g.id));
  const keptGroupIds: number[] = [];

  for (const [gi, g] of input.grupos.entries()) {
    let groupId: number;
    if (g.id && ownGroupIds.has(g.id)) {
      groupId = g.id;
      await tx
        .update(optionGroups)
        .set({ nombre: g.nombre, clave: g.clave, orden: gi })
        .where(eq(optionGroups.id, groupId));
    } else {
      const [row] = await tx
        .insert(optionGroups)
        .values({ productId, nombre: g.nombre, clave: g.clave, orden: gi })
        .returning({ id: optionGroups.id });
      groupId = row!.id;
    }
    keptGroupIds.push(groupId);

    const existingOpts = await tx
      .select({ id: options.id })
      .from(options)
      .where(eq(options.groupId, groupId));
    const ownOptIds = new Set(existingOpts.map((o) => o.id));
    const keptOptIds: number[] = [];
    // Exactamente una opción por defecto por grupo: la marcada, o la primera.
    const defaultIndex = Math.max(
      0,
      g.opciones.findIndex((o) => o.esDefault),
    );

    for (const [oi, o] of g.opciones.entries()) {
      const values = {
        label: o.label,
        modificador: o.modificador,
        tipoModificador: o.tipoModificador,
        valorCantidad: g.clave === 'cantidad' ? o.valorCantidad : null,
        esDefault: oi === defaultIndex,
        orden: oi,
      };
      if (o.id && ownOptIds.has(o.id)) {
        await tx.update(options).set(values).where(eq(options.id, o.id));
        keptOptIds.push(o.id);
      } else {
        const [row] = await tx
          .insert(options)
          .values({ groupId, ...values })
          .returning({ id: options.id });
        keptOptIds.push(row!.id);
      }
    }
    await tx
      .delete(options)
      .where(and(eq(options.groupId, groupId), notInArray(options.id, keptOptIds)));
  }

  await tx
    .delete(optionGroups)
    .where(
      and(
        eq(optionGroups.productId, productId),
        keptGroupIds.length ? notInArray(optionGroups.id, keptGroupIds) : sql`true`,
      ),
    );

  await tx.delete(priceTiers).where(eq(priceTiers.productId, productId));
  if (input.tiers.length) {
    await tx.insert(priceTiers).values(input.tiers.map((t) => ({ productId, ...t })));
  }
}

function productValues(p: ProductInput) {
  const { grupos: _g, tiers: _t, ...rest } = p;
  return rest;
}

adminCatalogRouter.post('/products', async (req, res) => {
  const input = zodMessage(productSchema, req.body) as ProductInput;
  const productId = await uniqueOr409(() =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values(productValues(input))
        .returning({ id: products.id });
      await syncNested(tx, row!.id, input);
      return row!.id;
    }),
  );
  res.status(201).json({ id: productId });
});

adminCatalogRouter.put('/products/:id', async (req, res) => {
  const productId = parse(id, req.params.id);
  const input = zodMessage(productSchema, req.body) as ProductInput;
  await uniqueOr409(() =>
    db.transaction(async (tx) => {
      const [row] = await tx
        .update(products)
        .set(productValues(input))
        .where(eq(products.id, productId))
        .returning({ id: products.id });
      if (!row) throw new HttpError(404, 'Producto no encontrado');
      await syncNested(tx, productId, input);
    }),
  );
  res.json({ id: productId });
});

adminCatalogRouter.delete('/products/:id', async (req, res) => {
  const productId = parse(id, req.params.id);
  const [inOrders] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(eq(orderItems.productId, productId));
  const [inPackages] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(packageItems)
    .where(eq(packageItems.productId, productId));
  if ((inOrders?.n ?? 0) > 0 || (inPackages?.n ?? 0) > 0) {
    throw new HttpError(
      409,
      'El producto está en pedidos o paquetes. Desactívalo en lugar de borrarlo.',
    );
  }
  await db.delete(products).where(eq(products.id, productId));
  res.status(204).end();
});

// --- Paquetes ---

async function loadAdminPackages(where?: ReturnType<typeof eq>): Promise<AdminPackage[]> {
  const pkgs = await db
    .select()
    .from(packages)
    .where(where)
    .orderBy(asc(packages.orden), asc(packages.id));
  if (!pkgs.length) return [];
  const items = await db
    .select()
    .from(packageItems)
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
    activo: p.activo,
    orden: p.orden,
    items: items
      .filter((i) => i.packageId === p.id)
      .map((i) => ({
        productId: i.productId,
        etiqueta: i.etiqueta,
        cantidad: i.cantidad,
        opcionesDefault: (i.opcionesDefault ?? {}) as Record<string, string>,
      })),
  }));
}

adminCatalogRouter.get('/packages', async (_req, res) => {
  res.json(await loadAdminPackages());
});

type PackageInput = z.infer<typeof packageSchema>;

async function savePackage(input: PackageInput, packageId?: number): Promise<number> {
  return uniqueOr409(() =>
    db.transaction(async (tx) => {
      const { items, ...values } = input;
      // Solo un paquete lleva "Recomendado para empezar".
      if (values.recomendado) {
        await tx
          .update(packages)
          .set({ recomendado: false })
          .where(packageId ? sql`${packages.id} <> ${packageId}` : sql`true`);
      }
      let pid = packageId;
      if (pid) {
        const [row] = await tx
          .update(packages)
          .set(values)
          .where(eq(packages.id, pid))
          .returning({ id: packages.id });
        if (!row) throw new HttpError(404, 'Paquete no encontrado');
        await tx.delete(packageItems).where(eq(packageItems.packageId, pid));
      } else {
        const [row] = await tx.insert(packages).values(values).returning({ id: packages.id });
        pid = row!.id;
      }
      await tx
        .insert(packageItems)
        .values(items.map((it, i) => ({ packageId: pid!, ...it, orden: i })));
      return pid!;
    }),
  );
}

adminCatalogRouter.post('/packages', async (req, res) => {
  const input = zodMessage(packageSchema, req.body) as PackageInput;
  res.status(201).json({ id: await savePackage(input) });
});

adminCatalogRouter.put('/packages/:id', async (req, res) => {
  const packageId = parse(id, req.params.id);
  const input = zodMessage(packageSchema, req.body) as PackageInput;
  res.json({ id: await savePackage(input, packageId) });
});

adminCatalogRouter.delete('/packages/:id', async (req, res) => {
  const packageId = parse(id, req.params.id);
  const [used] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(eq(orderItems.packageId, packageId));
  if (used && used.n > 0) {
    throw new HttpError(409, 'El paquete está en pedidos. Desactívalo en lugar de borrarlo.');
  }
  await db.delete(packages).where(eq(packages.id, packageId));
  res.status(204).end();
});

// --- Servicios mensuales ---

adminCatalogRouter.get('/services', async (_req, res) => {
  const rows = await db
    .select({
      id: recurringServices.id,
      slug: recurringServices.slug,
      nombre: recurringServices.nombre,
      descripcion: recurringServices.descripcion,
      precioMensual: recurringServices.precioMensual,
      orden: recurringServices.orden,
    })
    .from(recurringServices)
    .orderBy(asc(recurringServices.orden), asc(recurringServices.id));
  res.json(rows satisfies AdminService[]);
});

adminCatalogRouter.post('/services', async (req, res) => {
  const data = zodMessage(serviceSchema, req.body) as z.infer<typeof serviceSchema>;
  const [row] = await uniqueOr409(() => db.insert(recurringServices).values(data).returning());
  res.status(201).json(row);
});

adminCatalogRouter.put('/services/:id', async (req, res) => {
  const serviceId = parse(id, req.params.id);
  const data = zodMessage(serviceSchema, req.body) as z.infer<typeof serviceSchema>;
  const [row] = await uniqueOr409(() =>
    db.update(recurringServices).set(data).where(eq(recurringServices.id, serviceId)).returning(),
  );
  if (!row) throw new HttpError(404, 'Servicio no encontrado');
  res.json(row);
});

adminCatalogRouter.delete('/services/:id', async (req, res) => {
  const serviceId = parse(id, req.params.id);
  await db.delete(recurringServices).where(eq(recurringServices.id, serviceId));
  res.status(204).end();
});
