CREATE TYPE "public"."incident_submission_method" AS ENUM('web', 'whatsapp', 'sms', 'email');--> statement-breakpoint
CREATE TABLE "property_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "incidents" ALTER COLUMN "tenant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "submission_method" "incident_submission_method" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "submitted_phone" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "submitted_name" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "incident_submission_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "incident_submission_phone" text;--> statement-breakpoint
ALTER TABLE "service_provider_areas" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "whatsapp_code" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "whatsapp_message_id" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "whatsapp_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "whatsapp_reply_id" text;--> statement-breakpoint
ALTER TABLE "property_codes" ADD CONSTRAINT "property_codes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_codes" ADD CONSTRAINT "property_codes_created_by_user_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;