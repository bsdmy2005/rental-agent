CREATE TABLE "rule_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_rule_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extraction_rules" ALTER COLUMN "property_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "invoice_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "payment_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "extract_for_invoice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "extract_for_payment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "invoice_extraction_config" jsonb;--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "payment_extraction_config" jsonb;--> statement-breakpoint
ALTER TABLE "rule_samples" ADD CONSTRAINT "rule_samples_extraction_rule_id_extraction_rules_id_fk" FOREIGN KEY ("extraction_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_invoice_rule_id_extraction_rules_id_fk" FOREIGN KEY ("invoice_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_payment_rule_id_extraction_rules_id_fk" FOREIGN KEY ("payment_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_rules" DROP COLUMN "purpose";--> statement-breakpoint
ALTER TABLE "extraction_rules" DROP COLUMN "extraction_config";