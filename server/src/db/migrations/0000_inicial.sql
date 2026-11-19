CREATE TYPE "public"."delivery_method" AS ENUM('recoger', 'domicilio');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('producto', 'paquete');--> statement-breakpoint
CREATE TYPE "public"."modifier_type" AS ENUM('fijo', 'porcentaje', 'por_unidad');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('nuevo', 'en_diseno', 'prueba_enviada', 'aprobado', 'en_produccion', 'listo', 'entregado');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('tarjeta', 'transferencia', 'tienda');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pendiente', 'pagado', 'fallido', 'reembolsado');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"whatsapp" text NOT NULL,
	"correo" text,
	"giro" text,
	"origen" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_whatsapp_unique" UNIQUE("whatsapp")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"session_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref_code" text NOT NULL,
	"product_id" integer,
	"opciones" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"canal" text DEFAULT 'whatsapp' NOT NULL,
	"convertido_a_order_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_ref_code_unique" UNIQUE("ref_code")
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"clave" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"label" text NOT NULL,
	"modificador" integer DEFAULT 0 NOT NULL,
	"tipo_modificador" "modifier_type" DEFAULT 'fijo' NOT NULL,
	"valor_cantidad" integer,
	"es_default" boolean DEFAULT false NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"tipo" "item_type" NOT NULL,
	"product_id" integer,
	"package_id" integer,
	"opciones" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" integer NOT NULL,
	"total" integer NOT NULL,
	"archivo_url" text,
	CONSTRAINT "order_items_one_ref" CHECK (("order_items"."tipo" = 'producto' AND "order_items"."product_id" IS NOT NULL AND "order_items"."package_id" IS NULL)
       OR ("order_items"."tipo" = 'paquete' AND "order_items"."package_id" IS NOT NULL AND "order_items"."product_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"folio" text NOT NULL,
	"customer_id" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"descuento" integer DEFAULT 0 NOT NULL,
	"envio" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"estado" "order_status" DEFAULT 'nuevo' NOT NULL,
	"estado_pago" "payment_status" DEFAULT 'pendiente' NOT NULL,
	"metodo_pago" "payment_method" NOT NULL,
	"pago_ref" text,
	"entrega" "delivery_method" NOT NULL,
	"direccion" text,
	"como_nos_conocio" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"ref_code" text,
	"package_upgrade" boolean DEFAULT false NOT NULL,
	"manual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_folio_unique" UNIQUE("folio")
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"etiqueta" text NOT NULL,
	"cantidad" integer,
	"opciones_default" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"giro" text,
	"descripcion" text,
	"precio" integer,
	"destacado" boolean DEFAULT false NOT NULL,
	"recomendado" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"imagenes" text[] DEFAULT '{}'::text[] NOT NULL,
	"precio_base" integer,
	"unidad" text DEFAULT 'pzas' NOT NULL,
	"cantidad_minima" integer,
	"tiempo_entrega_dias" integer,
	"entrega_rapida" boolean DEFAULT false NOT NULL,
	"incluye_diseno" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"giros" text[] DEFAULT '{}'::text[] NOT NULL,
	"popularidad" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recurring_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"precio_mensual" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "recurring_services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertido_a_order_id_orders_id_fk" FOREIGN KEY ("convertido_a_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_nombre_created_idx" ON "events" USING btree ("nombre","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "price_tiers_product_qty_uq" ON "price_tiers" USING btree ("product_id","cantidad");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");