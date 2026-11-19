/**
 * Esquema de la BD. Todo el dinero va en centavos (integer).
 * Los precios son NULL mientras el negocio no los defina: la UI muestra "$[PRECIO]".
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const modifierType = pgEnum('modifier_type', ['fijo', 'porcentaje', 'por_unidad']);
export const orderStatus = pgEnum('order_status', [
  'nuevo',
  'en_diseno',
  'prueba_enviada',
  'aprobado',
  'en_produccion',
  'listo',
  'entregado',
]);
export const paymentStatus = pgEnum('payment_status', [
  'pendiente',
  'pagado',
  'fallido',
  'reembolsado',
]);
export const paymentMethod = pgEnum('payment_method', ['tarjeta', 'transferencia', 'tienda']);
export const deliveryMethod = pgEnum('delivery_method', ['recoger', 'domicilio']);
export const itemType = pgEnum('item_type', ['producto', 'paquete']);

// --- Catálogo ---

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  orden: integer('orden').notNull().default(0),
});

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    imagenes: text('imagenes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Precio por unidad en centavos. NULL = aún sin precio. */
    precioBase: integer('precio_base'),
    unidad: text('unidad').notNull().default('pzas'),
    cantidadMinima: integer('cantidad_minima'),
    tiempoEntregaDias: integer('tiempo_entrega_dias'),
    entregaRapida: boolean('entrega_rapida').notNull().default(false),
    incluyeDiseno: boolean('incluye_diseno').notNull().default(false),
    activo: boolean('activo').notNull().default(true),
    /** Giros a los que aplica. Vacío = aplica a todos. */
    giros: text('giros')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    popularidad: integer('popularidad').notNull().default(0),
    /** Prefijo del código de referencia de WhatsApp, ej. "TJ" → TJ-4F2A. */
    refPrefijo: text('ref_prefijo'),
  },
  (t) => [index('products_category_idx').on(t.categoryId)],
);

export const optionGroups = pgTable('option_groups', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  /** cantidad | material | acabado | caras | diseno */
  clave: text('clave').notNull(),
  orden: integer('orden').notNull().default(0),
});

export const options = pgTable('options', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => optionGroups.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  /**
   * Centavos (fijo / por_unidad) o puntos porcentuales (porcentaje).
   * NULL = el negocio aún no define el costo de esta opción; la cotización queda "por confirmar".
   */
  modificador: integer('modificador'),
  tipoModificador: modifierType('tipo_modificador').notNull().default('fijo'),
  /** Para el grupo "cantidad": número de piezas que representa la opción. */
  valorCantidad: integer('valor_cantidad'),
  esDefault: boolean('es_default').notNull().default(false),
  orden: integer('orden').notNull().default(0),
});

export const priceTiers = pgTable(
  'price_tiers',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    cantidad: integer('cantidad').notNull(),
    precioUnitario: integer('precio_unitario').notNull(),
  },
  (t) => [uniqueIndex('price_tiers_product_qty_uq').on(t.productId, t.cantidad)],
);

// --- Paquetes y servicios ---

export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nombre: text('nombre').notNull(),
  /** NULL = paquete general (sale en "Todos"). */
  giro: text('giro'),
  descripcion: text('descripcion'),
  precio: integer('precio'),
  destacado: boolean('destacado').notNull().default(false),
  recomendado: boolean('recomendado').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  orden: integer('orden').notNull().default(0),
});

export const packageItems = pgTable('package_items', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id')
    .notNull()
    .references(() => packages.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id),
  /** Texto que se muestra en la lista del paquete, ej. "500 tarjetas". */
  etiqueta: text('etiqueta').notNull(),
  cantidad: integer('cantidad'),
  opcionesDefault: jsonb('opciones_default').notNull().default({}),
  orden: integer('orden').notNull().default(0),
});

export const recurringServices = pgTable('recurring_services', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  precioMensual: integer('precio_mensual'),
  orden: integer('orden').notNull().default(0),
});

// --- Clientes, pedidos y medición ---

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  whatsapp: text('whatsapp').notNull().unique(),
  correo: text('correo'),
  giro: text('giro'),
  origen: text('origen'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    folio: text('folio').notNull().unique(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    subtotal: integer('subtotal').notNull(),
    descuento: integer('descuento').notNull().default(0),
    envio: integer('envio').notNull().default(0),
    total: integer('total').notNull(),
    estado: orderStatus('estado').notNull().default('nuevo'),
    estadoPago: paymentStatus('estado_pago').notNull().default('pendiente'),
    metodoPago: paymentMethod('metodo_pago').notNull(),
    pagoRef: text('pago_ref'),
    entrega: deliveryMethod('entrega').notNull(),
    direccion: text('direccion'),
    comoNosConocio: text('como_nos_conocio'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    refCode: text('ref_code'),
    packageUpgrade: boolean('package_upgrade').notNull().default(false),
    /** true cuando el admin lo captura a mano (venta por WhatsApp). */
    manual: boolean('manual').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_customer_idx').on(t.customerId),
    index('orders_created_idx').on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    tipo: itemType('tipo').notNull(),
    productId: integer('product_id').references(() => products.id),
    packageId: integer('package_id').references(() => packages.id),
    opciones: jsonb('opciones').notNull().default({}),
    cantidad: integer('cantidad').notNull(),
    precioUnitario: integer('precio_unitario').notNull(),
    total: integer('total').notNull(),
    archivoUrl: text('archivo_url'),
  },
  (t) => [
    check(
      'order_items_one_ref',
      sql`(${t.tipo} = 'producto' AND ${t.productId} IS NOT NULL AND ${t.packageId} IS NULL)
       OR (${t.tipo} = 'paquete' AND ${t.packageId} IS NOT NULL AND ${t.productId} IS NULL)`,
    ),
  ],
);

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  refCode: text('ref_code').notNull().unique(),
  productId: integer('product_id').references(() => products.id),
  opciones: jsonb('opciones').notNull().default({}),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  canal: text('canal').notNull().default('whatsapp'),
  convertidoAOrderId: integer('convertido_a_order_id').references(() => orders.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    nombre: text('nombre').notNull(),
    sessionId: text('session_id'),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_nombre_created_idx').on(t.nombre, t.createdAt)],
);

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
