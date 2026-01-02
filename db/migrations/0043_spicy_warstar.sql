ALTER TABLE "moving_inspections" ADD COLUMN "inspector_access_token" text;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "inspector_signature_data" jsonb;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "inspector_name" text;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "inspector_email" text;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "inspector_company" text;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "inspector_phone" text;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "signed_by_inspector" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "inspected_by_third_party" boolean DEFAULT false NOT NULL;