/**
 * Datos semilla del catálogo.
 *
 * - Ningún precio es inventado: precio_base, precio de paquete y precio mensual quedan en NULL
 *   y la UI muestra "$[PRECIO]" hasta que el negocio los capture en el admin.
 * - Borra y vuelve a crear el catálogo. Si ya hay pedidos se detiene, para no perder datos.
 */
import { sql } from 'drizzle-orm';
import { db, pool } from './client';
import { categories, orders, packageItems, packages, products, recurringServices } from './schema';

type ProductSeed = {
  slug: string;
  cat: string;
  nombre: string;
  descripcion: string;
  unidad?: string;
  cantidadMinima?: number;
  entregaRapida?: boolean;
  incluyeDiseno?: boolean;
  giros?: string[];
  popularidad?: number;
};

const CATEGORIES = [
  {
    slug: 'impresos',
    nombre: 'Impresos',
    descripcion: 'Tarjetas, flyers, menús, talonarios y etiquetas.',
  },
  {
    slug: 'gran-formato',
    nombre: 'Gran formato',
    descripcion: 'Lonas, viniles, letreros y rotulación.',
  },
  {
    slug: 'promocionales',
    nombre: 'Promocionales',
    descripcion: 'Playeras, uniformes y bolsas con tu logo.',
  },
  {
    slug: 'identidad-de-marca',
    nombre: 'Identidad de marca',
    descripcion: 'Logotipo y perfiles de redes listos para usar.',
  },
  {
    slug: 'digital',
    nombre: 'Digital',
    descripcion: 'Google Maps, páginas web y redes sociales.',
  },
];

const PRODUCTS: ProductSeed[] = [
  // Impresos
  {
    slug: 'tarjetas-de-presentacion',
    cat: 'impresos',
    nombre: 'Tarjetas de presentación',
    descripcion: 'Tarjetas en papel couché o opalina, a una o dos caras.',
    cantidadMinima: 100,
    entregaRapida: true,
    popularidad: 100,
  },
  {
    slug: 'flyers',
    cat: 'impresos',
    nombre: 'Flyers / volantes',
    descripcion: 'Volantes para repartir o dejar en mostrador.',
    cantidadMinima: 100,
    entregaRapida: true,
    popularidad: 90,
  },
  {
    slug: 'menus',
    cat: 'impresos',
    nombre: 'Menús',
    descripcion: 'Menús para mesa o mostrador, enmicados o en cartulina.',
    cantidadMinima: 10,
    giros: ['comida'],
    popularidad: 60,
  },
  {
    slug: 'talonarios',
    cat: 'impresos',
    nombre: 'Talonarios y notas',
    descripcion: 'Notas de venta, recibos y órdenes de servicio foliadas.',
    unidad: 'blocks',
    cantidadMinima: 5,
    giros: ['servicios', 'comercio'],
    popularidad: 40,
  },
  {
    slug: 'recetarios',
    cat: 'impresos',
    nombre: 'Recetarios',
    descripcion: 'Recetarios médicos con tus datos y cédula.',
    unidad: 'blocks',
    cantidadMinima: 5,
    giros: ['salud'],
    popularidad: 35,
  },
  {
    slug: 'tarjetas-de-cita',
    cat: 'impresos',
    nombre: 'Tarjetas de cita y lealtad',
    descripcion: 'Tarjetas para agendar la próxima cita o sellar visitas.',
    cantidadMinima: 100,
    giros: ['belleza', 'salud'],
    popularidad: 45,
  },
  {
    slug: 'etiquetas',
    cat: 'impresos',
    nombre: 'Etiquetas adhesivas',
    descripcion: 'Etiquetas para productos, empaques y envíos.',
    cantidadMinima: 100,
    giros: ['comercio', 'comida'],
    popularidad: 50,
  },
  // Gran formato
  {
    slug: 'lonas',
    cat: 'gran-formato',
    nombre: 'Lona impresa',
    descripcion: 'Lona para fachada, eventos o promociones, con ojillos.',
    unidad: 'm²',
    cantidadMinima: 1,
    entregaRapida: true,
    popularidad: 85,
  },
  {
    slug: 'vinil-vitrina',
    cat: 'gran-formato',
    nombre: 'Vinil para vitrina',
    descripcion: 'Vinil recortado o impreso para aparadores y cristales.',
    unidad: 'm²',
    cantidadMinima: 1,
    giros: ['belleza', 'comercio'],
    popularidad: 55,
  },
  {
    slug: 'letrero-exterior',
    cat: 'gran-formato',
    nombre: 'Letrero exterior',
    descripcion: 'Letrero rígido para fachada o bandera.',
    unidad: 'pza',
    cantidadMinima: 1,
    popularidad: 30,
  },
  {
    slug: 'rotulacion-vehicular',
    cat: 'gran-formato',
    nombre: 'Rotulación de vehículo',
    descripcion: 'Rotulación de puertas, medallón o vehículo completo.',
    unidad: 'vehículo',
    cantidadMinima: 1,
    giros: ['servicios'],
    popularidad: 25,
  },
  // Promocionales
  {
    slug: 'playeras',
    cat: 'promocionales',
    nombre: 'Playeras con logo',
    descripcion: 'Playeras estampadas o bordadas con tu marca.',
    cantidadMinima: 10,
    popularidad: 70,
  },
  {
    slug: 'uniformes',
    cat: 'promocionales',
    nombre: 'Uniformes con logo',
    descripcion: 'Filipinas, mandiles y camisas para tu equipo.',
    cantidadMinima: 5,
    giros: ['belleza', 'comida', 'salud'],
    popularidad: 40,
  },
  {
    slug: 'bolsas',
    cat: 'promocionales',
    nombre: 'Bolsas con logo',
    descripcion: 'Bolsas de papel o tela para entregar tus productos.',
    cantidadMinima: 50,
    giros: ['comercio'],
    popularidad: 35,
  },
  // Identidad de marca
  {
    slug: 'logotipo',
    cat: 'identidad-de-marca',
    nombre: 'Diseño de logotipo',
    descripcion: 'Logotipo con propuestas, ajustes y archivos finales.',
    unidad: 'proyecto',
    cantidadMinima: 1,
    incluyeDiseno: true,
    popularidad: 65,
  },
  {
    slug: 'perfil-instagram',
    cat: 'identidad-de-marca',
    nombre: 'Perfil de Instagram diseñado',
    descripcion: 'Foto de perfil, portadas de historias destacadas y primeras publicaciones.',
    unidad: 'proyecto',
    cantidadMinima: 1,
    incluyeDiseno: true,
    giros: ['belleza'],
    popularidad: 30,
  },
  // Digital
  {
    slug: 'google-maps',
    cat: 'digital',
    nombre: 'Alta en Google Maps',
    descripcion: 'Damos de alta y optimizamos tu ficha de negocio en Google.',
    unidad: 'servicio',
    cantidadMinima: 1,
    incluyeDiseno: true,
    popularidad: 50,
  },
  {
    slug: 'landing-page',
    cat: 'digital',
    nombre: 'Landing page',
    descripcion: 'Página de una sección con tus servicios y botón de WhatsApp.',
    unidad: 'proyecto',
    cantidadMinima: 1,
    incluyeDiseno: true,
    popularidad: 30,
  },
  {
    slug: 'landing-agenda',
    cat: 'digital',
    nombre: 'Landing page con agenda',
    descripcion: 'Página con agenda en línea para que tus pacientes reserven.',
    unidad: 'proyecto',
    cantidadMinima: 1,
    incluyeDiseno: true,
    giros: ['salud', 'belleza'],
    popularidad: 20,
  },
  {
    slug: 'catalogo-web',
    cat: 'digital',
    nombre: 'Catálogo web',
    descripcion: 'Catálogo de productos en línea con pedidos por WhatsApp.',
    unidad: 'proyecto',
    cantidadMinima: 1,
    incluyeDiseno: true,
    giros: ['comercio'],
    popularidad: 20,
  },
  {
    slug: 'redes-sociales-mes',
    cat: 'digital',
    nombre: 'Redes sociales (1 mes)',
    descripcion: 'Diseño y publicación de contenido en Facebook e Instagram por un mes.',
    unidad: 'mes',
    cantidadMinima: 1,
    incluyeDiseno: true,
    popularidad: 25,
  },
];

type PackageSeed = {
  slug: string;
  nombre: string;
  giro: string | null;
  descripcion: string;
  destacado?: boolean;
  recomendado?: boolean;
  items: { product: string; etiqueta: string; cantidad?: number; opciones?: object }[];
};

const PACKAGES: PackageSeed[] = [
  {
    slug: 'arranque',
    nombre: 'Arranque',
    giro: null,
    descripcion: 'Lo básico para abrir tu negocio con imagen profesional.',
    destacado: true,
    recomendado: true,
    items: [
      { product: 'logotipo', etiqueta: 'Logotipo', cantidad: 1 },
      { product: 'tarjetas-de-presentacion', etiqueta: '500 tarjetas', cantidad: 500 },
      {
        product: 'lonas',
        etiqueta: 'Lona 2×1 m',
        cantidad: 2,
        opciones: { medida: '2×1 m' },
      },
      { product: 'google-maps', etiqueta: 'Alta en Google Maps', cantidad: 1 },
    ],
  },
  {
    slug: 'restaurante',
    nombre: 'Restaurante',
    giro: 'comida',
    descripcion: 'Menús, fachada y promoción para llenar mesas.',
    destacado: true,
    items: [
      { product: 'menus', etiqueta: '50 menús', cantidad: 50 },
      { product: 'lonas', etiqueta: 'Lona de fachada' },
      { product: 'flyers', etiqueta: '1,000 flyers', cantidad: 1000 },
      { product: 'redes-sociales-mes', etiqueta: 'Redes sociales 1 mes', cantidad: 1 },
    ],
  },
  {
    slug: 'belleza',
    nombre: 'Belleza',
    giro: 'belleza',
    descripcion: 'Para estéticas, barberías, uñas y spas.',
    items: [
      { product: 'tarjetas-de-cita', etiqueta: 'Tarjetas de cita / lealtad' },
      { product: 'vinil-vitrina', etiqueta: 'Vinil para vitrina' },
      { product: 'uniformes', etiqueta: 'Uniformes con logo' },
      { product: 'perfil-instagram', etiqueta: 'Perfil de Instagram diseñado', cantidad: 1 },
    ],
  },
  {
    slug: 'servicios',
    nombre: 'Servicios',
    giro: 'servicios',
    descripcion: 'Para técnicos, plomeros, mudanzas y servicios a domicilio.',
    items: [
      { product: 'rotulacion-vehicular', etiqueta: 'Rotulación de vehículo', cantidad: 1 },
      { product: 'tarjetas-de-presentacion', etiqueta: 'Tarjetas de presentación' },
      { product: 'talonarios', etiqueta: 'Talonarios' },
      { product: 'playeras', etiqueta: 'Playeras con logo' },
      { product: 'google-maps', etiqueta: 'Alta en Google Maps', cantidad: 1 },
    ],
  },
  {
    slug: 'salud',
    nombre: 'Salud',
    giro: 'salud',
    descripcion: 'Para consultorios, dentistas y clínicas.',
    items: [
      { product: 'recetarios', etiqueta: 'Recetarios' },
      { product: 'tarjetas-de-cita', etiqueta: 'Tarjetas de cita' },
      { product: 'letrero-exterior', etiqueta: 'Letrero exterior', cantidad: 1 },
      { product: 'landing-agenda', etiqueta: 'Landing page con agenda', cantidad: 1 },
      { product: 'google-maps', etiqueta: 'Alta en Google Maps', cantidad: 1 },
    ],
  },
  {
    slug: 'comercio',
    nombre: 'Comercio local',
    giro: 'comercio',
    descripcion: 'Para tiendas, abarrotes, boutiques y papelerías.',
    destacado: true,
    items: [
      { product: 'vinil-vitrina', etiqueta: 'Vinil para vitrina' },
      { product: 'etiquetas', etiqueta: 'Etiquetas con logo' },
      { product: 'bolsas', etiqueta: 'Bolsas con logo' },
      { product: 'flyers', etiqueta: 'Flyers de promoción' },
      { product: 'catalogo-web', etiqueta: 'Landing page o catálogo web', cantidad: 1 },
    ],
  },
];

const SERVICES = [
  {
    slug: 'redes-sociales',
    nombre: 'Manejo de redes sociales',
    descripcion: 'Diseño, publicación y respuesta de mensajes en Facebook e Instagram.',
  },
  {
    slug: 'anuncios',
    nombre: 'Anuncios en Meta y Google',
    descripcion: 'Campañas para atraer clientes de tu zona, con reporte mensual.',
  },
  {
    slug: 'pagina-web',
    nombre: 'Página web',
    descripcion: 'Hosting, dominio, cambios y mantenimiento de tu sitio.',
  },
];

async function main() {
  const [{ count }] = (await db.select({ count: sql<number>`count(*)::int` }).from(orders)) as [
    { count: number },
  ];
  if (count > 0 && !process.argv.includes('--force')) {
    console.error(
      `Hay ${count} pedidos en la BD. El seed borra el catálogo; usa --force si de verdad quieres.`,
    );
    process.exitCode = 1;
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE package_items, packages, recurring_services, price_tiers, options, option_groups, products, categories RESTART IDENTITY CASCADE`,
    );

    const cats = await tx
      .insert(categories)
      .values(CATEGORIES.map((c, i) => ({ ...c, orden: i })))
      .returning({ id: categories.id, slug: categories.slug });
    const catId = new Map(cats.map((c) => [c.slug, c.id]));

    const prods = await tx
      .insert(products)
      .values(
        PRODUCTS.map(({ cat, ...p }) => ({
          ...p,
          categoryId: catId.get(cat)!,
        })),
      )
      .returning({ id: products.id, slug: products.slug });
    const prodId = new Map(prods.map((p) => [p.slug, p.id]));

    for (const [i, { items, ...pkg }] of PACKAGES.entries()) {
      const [created] = await tx
        .insert(packages)
        .values({ ...pkg, orden: i })
        .returning({ id: packages.id });
      await tx.insert(packageItems).values(
        items.map((it, j) => {
          const productId = prodId.get(it.product);
          if (!productId)
            throw new Error(`Producto desconocido en paquete ${pkg.slug}: ${it.product}`);
          return {
            packageId: created!.id,
            productId,
            etiqueta: it.etiqueta,
            cantidad: it.cantidad,
            opcionesDefault: it.opciones ?? {},
            orden: j,
          };
        }),
      );
    }

    await tx.insert(recurringServices).values(SERVICES.map((s, i) => ({ ...s, orden: i })));
  });

  console.log(
    `Seed listo: ${CATEGORIES.length} categorías, ${PRODUCTS.length} productos, ${PACKAGES.length} paquetes, ${SERVICES.length} servicios.`,
  );
}

await main();
await pool.end();
