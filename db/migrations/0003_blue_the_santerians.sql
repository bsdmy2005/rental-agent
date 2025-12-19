CREATE TYPE "public"."extraction_purpose" AS ENUM('invoice_generation', 'payment_processing');--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "invoice_extraction_data" jsonb;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "payment_extraction_data" jsonb;--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "purpose" "extraction_purpose" NOT NULL;