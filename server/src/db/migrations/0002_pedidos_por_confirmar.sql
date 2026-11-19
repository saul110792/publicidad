ALTER TABLE "order_items" ALTER COLUMN "precio_unitario" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "total" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "subtotal" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "envio" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "envio" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total" DROP NOT NULL;