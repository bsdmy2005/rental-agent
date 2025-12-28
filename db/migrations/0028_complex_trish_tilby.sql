CREATE TYPE "public"."attachment_type" AS ENUM('photo', 'document');--> statement-breakpoint
CREATE TYPE "public"."condition_change" AS ENUM('improved', 'same', 'deteriorated', 'new_defect');--> statement-breakpoint
CREATE TYPE "public"."defect_severity" AS ENUM('minor', 'moderate', 'major');--> statement-breakpoint
CREATE TYPE "public"."escalation_type" AS ENUM('percentage', 'fixed_amount', 'cpi', 'none');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('draft', 'in_progress', 'completed', 'signed');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('moving_in', 'moving_out');--> statement-breakpoint
CREATE TYPE "public"."item_condition" AS ENUM('good', 'fair', 'poor', 'defective');--> statement-breakpoint
CREATE TYPE "public"."lease_lifecycle_state" AS ENUM('waiting', 'signed', 'moving_in_pending', 'active', 'escalation_due', 'moving_out_pending', 'completed');--> statement-breakpoint
CREATE TYPE "public"."quote_submission_method" AS ENUM('email', 'web_form', 'whatsapp');--> statement-breakpoint
CREATE TABLE "lease_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lease_agreement_id" uuid NOT NULL,
	"escalation_date" timestamp NOT NULL,
	"previous_amount" numeric NOT NULL,
	"new_amount" numeric NOT NULL,
	"escalation_type" "escalation_type" NOT NULL,
	"escalation_value" numeric NOT NULL,
	"document_file_url" text,
	"document_file_name" text,
	"signed_by_tenant" boolean DEFAULT false NOT NULL,
	"signed_by_landlord" boolean DEFAULT false NOT NULL,
	"signed_at" timestamp,
	"tenant_signature_data" jsonb,
	"landlord_signature_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rfq_id" uuid NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rfq_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "moving_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lease_agreement_id" uuid NOT NULL,
	"inspection_type" "inspection_type" NOT NULL,
	"status" "inspection_status" DEFAULT 'draft' NOT NULL,
	"inspected_by" text NOT NULL,
	"signed_by_tenant" boolean DEFAULT false NOT NULL,
	"signed_by_landlord" boolean DEFAULT false NOT NULL,
	"signed_at" timestamp,
	"tenant_signature_data" jsonb,
	"landlord_signature_data" jsonb,
	"tenant_notes" text,
	"landlord_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moving_inspection_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moving_inspection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"condition" "item_condition" DEFAULT 'good' NOT NULL,
	"notes" text,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moving_inspection_defects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text NOT NULL,
	"severity" "defect_severity" DEFAULT 'minor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moving_inspection_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"item_id" uuid,
	"defect_id" uuid,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"attachment_type" "attachment_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moving_inspection_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"extraction_status" "extraction_status" DEFAULT 'pending' NOT NULL,
	"extracted_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moving_inspection_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moving_in_inspection_id" uuid NOT NULL,
	"moving_out_inspection_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"condition_change" "condition_change" NOT NULL,
	"comparison_notes" text,
	"damage_charge_applicable" boolean DEFAULT false NOT NULL,
	"damage_charge_amount" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_requests" ALTER COLUMN "incident_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "lifecycle_state" "lease_lifecycle_state" DEFAULT 'waiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "signed_by_tenant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "signed_by_landlord" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "tenant_signature_data" jsonb;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "landlord_signature_data" jsonb;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "escalation_type" "escalation_type" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "escalation_percentage" numeric;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "escalation_fixed_amount" numeric;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "next_escalation_date" timestamp;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "escalation_frequency_months" numeric;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "property_id" uuid;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "rfq_code" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "sent_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "received_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "submission_code" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "submitted_via" "quote_submission_method" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "extracted_from" jsonb;--> statement-breakpoint
ALTER TABLE "lease_escalations" ADD CONSTRAINT "lease_escalations_lease_agreement_id_lease_agreements_id_fk" FOREIGN KEY ("lease_agreement_id") REFERENCES "public"."lease_agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_codes" ADD CONSTRAINT "rfq_codes_rfq_id_quote_requests_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD CONSTRAINT "moving_inspections_lease_agreement_id_lease_agreements_id_fk" FOREIGN KEY ("lease_agreement_id") REFERENCES "public"."lease_agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ADD CONSTRAINT "moving_inspection_items_inspection_id_moving_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."moving_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ADD CONSTRAINT "moving_inspection_items_category_id_moving_inspection_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."moving_inspection_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_defects" ADD CONSTRAINT "moving_inspection_defects_item_id_moving_inspection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."moving_inspection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_attachments" ADD CONSTRAINT "moving_inspection_attachments_inspection_id_moving_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."moving_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_attachments" ADD CONSTRAINT "moving_inspection_attachments_item_id_moving_inspection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."moving_inspection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_attachments" ADD CONSTRAINT "moving_inspection_attachments_defect_id_moving_inspection_defects_id_fk" FOREIGN KEY ("defect_id") REFERENCES "public"."moving_inspection_defects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_documents" ADD CONSTRAINT "moving_inspection_documents_inspection_id_moving_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."moving_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_comparisons" ADD CONSTRAINT "moving_inspection_comparisons_moving_in_inspection_id_moving_inspections_id_fk" FOREIGN KEY ("moving_in_inspection_id") REFERENCES "public"."moving_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_comparisons" ADD CONSTRAINT "moving_inspection_comparisons_moving_out_inspection_id_moving_inspections_id_fk" FOREIGN KEY ("moving_out_inspection_id") REFERENCES "public"."moving_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moving_inspection_comparisons" ADD CONSTRAINT "moving_inspection_comparisons_item_id_moving_inspection_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."moving_inspection_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_rfq_code_unique" UNIQUE("rfq_code");