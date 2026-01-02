ALTER TABLE "lease_agreements" ALTER COLUMN "initiation_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."lease_initiation_status";--> statement-breakpoint
CREATE TYPE "public"."lease_initiation_status" AS ENUM('draft', 'sent_to_landlord', 'landlord_signed', 'sent_to_tenant', 'tenant_signed', 'fully_executed');--> statement-breakpoint
ALTER TABLE "lease_agreements" ALTER COLUMN "initiation_status" SET DATA TYPE "public"."lease_initiation_status" USING "initiation_status"::"public"."lease_initiation_status";--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "landlord_signing_token" text;--> statement-breakpoint
ALTER TABLE "lease_agreements" ADD COLUMN "landlord_signing_expires_at" timestamp;