ALTER TABLE "options" ALTER COLUMN "modificador" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "options" ALTER COLUMN "modificador" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ref_prefijo" text;