ALTER TABLE "rental_invoice_templates" DROP CONSTRAINT "rental_invoice_templates_bill_template_id_bill_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD COLUMN "depends_on_bill_template_ids" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" DROP COLUMN "bill_template_id";--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD CONSTRAINT "rental_invoice_templates_tenant_id_property_id_unique" UNIQUE("tenant_id","property_id");