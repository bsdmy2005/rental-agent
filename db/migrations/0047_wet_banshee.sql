CREATE TYPE "public"."agency_admin_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."agency_membership_status" AS ENUM('pending', 'approved', 'rejected', 'removed');--> statement-breakpoint
CREATE TABLE "agency_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"role" "agency_admin_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_admins_agency_id_user_profile_id_unique" UNIQUE("agency_id","user_profile_id")
);
--> statement-breakpoint
CREATE TABLE "agency_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"rental_agent_id" uuid NOT NULL,
	"status" "agency_membership_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"rejected_by" uuid,
	"rejection_reason" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_memberships_agency_id_rental_agent_id_unique" UNIQUE("agency_id","rental_agent_id")
);
--> statement-breakpoint
CREATE TABLE "rental_agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_user_profile_id" uuid NOT NULL,
	"license_number" text,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_managements" ALTER COLUMN "rental_agent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_agents" ADD COLUMN "agency_id" uuid;--> statement-breakpoint
ALTER TABLE "property_managements" ADD COLUMN "agency_id" uuid;--> statement-breakpoint
ALTER TABLE "agency_admins" ADD CONSTRAINT "agency_admins_agency_id_rental_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."rental_agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_admins" ADD CONSTRAINT "agency_admins_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_agency_id_rental_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."rental_agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_rental_agent_id_rental_agents_id_fk" FOREIGN KEY ("rental_agent_id") REFERENCES "public"."rental_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_requested_by_user_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_approved_by_user_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_memberships" ADD CONSTRAINT "agency_memberships_rejected_by_user_profiles_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_agencies" ADD CONSTRAINT "rental_agencies_owner_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("owner_user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_agents" ADD CONSTRAINT "rental_agents_agency_id_rental_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."rental_agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_managements" ADD CONSTRAINT "property_managements_agency_id_rental_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."rental_agencies"("id") ON DELETE cascade ON UPDATE no action;