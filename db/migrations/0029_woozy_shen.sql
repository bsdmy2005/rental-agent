CREATE TYPE "public"."lease_initiation_method" AS ENUM('upload_existing', 'initiate_new');--> statement-breakpoint
CREATE TYPE "public"."lease_initiation_status" AS ENUM('draft', 'sent_to_tenant', 'tenant_signed', 'landlord_signed', 'fully_executed');--> statement-breakpoint
CREATE TABLE "lease_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"template_data" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "initiation_method" "lease_initiation_method" DEFAULT 'upload_existing' NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "initiation_status" "lease_initiation_status";--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "draft_pdf_url" text;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "final_pdf_url" text;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "tenant_signing_link" text;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "tenant_signing_token" text;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "tenant_signing_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "landlord_signing_link" text;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "initiated_at" timestamp;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "tenant_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "landlord_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "lease_templates" ADD CONSTRAINT "lease_templates_created_by_user_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;