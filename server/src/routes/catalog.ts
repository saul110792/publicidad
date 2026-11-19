import { Router } from 'express';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type {
  CategoryDTO,
  HomeDTO,
  PackageDTO,
  ProductCardDTO,
  ServiceDTO,
} from '@publicidad/shared';
import { db } from '../db/client';
import { categories, packageItems, packages, products, recurringServices } from '../db/schema';
import {
  escapeLike,
  precioDesde,
  precioSeparado,
  productQuerySchema,
  type ProductQuery,
} from '../services/catalog';

export const catalogRouter = Router();

// --- Consultas ---

async function getCategories(): Promise<CategoryDTO[]> {
  const rows = await db
    .select({
      slug: categories.slug,
      nombre: categories.nombre,
      descripcion: categories.descripcion,
      totalProductos: sql<number>`count(${products.id}) filter (where ${products.activo})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.orden));
  return rows;
}

export const productCardFields = {
  slug: products.slug,
  nombre: products.nombre,
  descripcion: products.descripcion,
  imagenes: products.imagenes,
  unidad: products.unidad,
  cantidadMinima: products.cantidadMinima,
  precioBase: products.precioBase,
  tiempoEntregaDias: products.tiempoEntregaDias,
  entregaRapida: products.entregaRapida,
  incluyeDiseno: products.incluyeDiseno,
  catSlug: categories.slug,
  catNombre: categories.nombre,
};

export type ProductRow = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  imagenes: string[];
  unidad: string;
  cantidadMinima: number | null;
  precioBase: number | null;
  tiempoEntregaDias: number | null;
  entregaRapida: boolean;
  incluyeDiseno: boolean;
  catSlug: string;
  catNombre: string;
};

export function toProductCard(r: ProductRow): ProductCardDTO {
  return {
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    categoria: { slug: r.catSlug, nombre: r.catNombre },
    imagen: r.imagenes[0] ?? null,
    unidad: r.unidad,
    cantidadMinima: r.cantidadMinima,
    precioDesde: precioDesde(r.precioBase, r.cantidadMinima),
    tiempoEntregaDias: r.tiempoEntregaDias,
    entregaRapida: r.entregaRapida,
    incluyeDiseno: r.incluyeDiseno,
  };
}

async function getProducts(q: ProductQuery, limit = 200): Promise<ProductCardDTO[]> {
  const conds: SQL[] = [eq(products.activo, true)];
  if (q.cat.length) conds.push(inArray(categories.slug, q.cat));
  if (q.q) {
    const pattern = `%${escapeLike(q.q)}%`;
    conds.push(or(ilike(products.nombre, pattern), ilike(products.descripcion, pattern))!);
  }
  if (q.giro) {
    // Productos del giro + productos generales (sin giro asignado).
    conds.push(
      or(sql`${q.giro} = ANY(${products.giros})`, sql`cardinality(${products.giros}) = 0`)!,
    );
  }
  if (q.rapida) conds.push(eq(products.entregaRapida, true));
  if (q.diseno) conds.push(eq(products.incluyeDiseno, true));

  const orderBy: SQL[] =
    q.orden === 'precio'
      ? [
          sql`${products.precioBase} * coalesce(${products.cantidadMinima}, 1) asc nulls last`,
          desc(products.popularidad),
        ]
      : q.orden === 'entrega'
        ? [
            desc(products.entregaRapida),
            sql`${products.tiempoEntregaDias} asc nulls last`,
            desc(products.popularidad),
          ]
        : [desc(products.popularidad), asc(products.nombre)];

  const rows = await db
    .select(productCardFields)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conds))
    .orderBy(...orderBy)
    .limit(limit);

  return rows.map(toProductCard);
}

export async function getPackages(
  opts: { giro?: string; soloDestacados?: boolean; ids?: number[] } = {},
) {
  const conds: SQL[] = [eq(packages.activo, true)];
  if (opts.giro) conds.push(or(eq(packages.giro, opts.giro), isNull(packages.giro))!);
  if (opts.soloDestacados) conds.push(eq(packages.destacado, true));
  if (opts.ids) conds.push(inArray(packages.id, opts.ids.length ? opts.ids : [-1]));

  const pkgs = await db
    .select()
    .from(packages)
    .where(and(...conds))
    .orderBy(asc(packages.orden));
  if (!pkgs.length) return [];

  const items = await db
    .select({
      packageId: packageItems.packageId,
      etiqueta: packageItems.etiqueta,
      cantidad: packageItems.cantidad,
      productSlug: products.slug,
      precioBase: products.precioBase,
      cantidadMinima: products.cantidadMinima,
    })
    .from(packageItems)
    .innerJoin(products, eq(products.id, packageItems.productId))
    .where(
      inArray(
        packageItems.packageId,
        pkgs.map((p) => p.id),
      ),
    )
    .orderBy(asc(packageItems.orden));

  return pkgs.map<PackageDTO>((p) => {
    const own = items.filter((i) => i.packageId === p.id);
    return {
      slug: p.slug,
      nombre: p.nombre,
      giro: p.giro,
      descripcion: p.descripcion,
      precio: p.precio,
      precioSeparado: precioSeparado(own),
      destacado: p.destacado,
      recomendado: p.recomendado,
      items: own.map((i) => ({ etiqueta: i.etiqueta, productSlug: i.productSlug })),
    };
  });
}

// --- Rutas ---

catalogRouter.get('/home', async (_req, res) => {
  const [categorias, masPedidos, paquetesDestacados] = await Promise.all([
    getCategories(),
    getProducts(productQuerySchema.parse({}), 4),
    getPackages({ soloDestacados: true }),
  ]);
  const body: HomeDTO = { categorias, masPedidos, paquetesDestacados };
  res.json(body);
});

catalogRouter.get('/categories', async (_req, res) => {
  res.json(await getCategories());
});

catalogRouter.get('/products', async (req, res) => {
  const query = productQuerySchema.parse(req.query);
  res.json(await getProducts(query));
});

catalogRouter.get('/packages', async (req, res) => {
  const giro = typeof req.query.giro === 'string' ? req.query.giro : undefined;
  res.json(await getPackages({ giro }));
});

catalogRouter.get('/services', async (_req, res) => {
  const rows = await db.select().from(recurringServices).orderBy(asc(recurringServices.orden));
  res.json(
    rows.map<ServiceDTO>((s) => ({
      slug: s.slug,
      nombre: s.nombre,
      descripcion: s.descripcion,
      precioMensual: s.precioMensual,
    })),
  );
});
