ALTER TABLE "properties" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "street_address" text NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "suburb" text NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "province" text NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "country" text NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "id_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "rental_amount" numeric;--> statement-breakpoint
ALTER TABLE "properties" DROP COLUMN "rental_amount";