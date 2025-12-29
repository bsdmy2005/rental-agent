CREATE TYPE "public"."incident_author_type" AS ENUM('tenant', 'agent', 'landlord', 'system');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_conversation_state" AS ENUM('idle', 'awaiting_email', 'awaiting_otp', 'awaiting_property', 'awaiting_description', 'awaiting_photos', 'incident_active', 'awaiting_closure_confirmation');--> statement-breakpoint
CREATE TABLE "incident_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"author_type" "incident_author_type" NOT NULL,
	"author_id" uuid,
	"author_phone" text,
	"author_name" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_incident_rate_limits" (
	"phone_number" text PRIMARY KEY NOT NULL,
	"submission_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"last_submission_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_conversation_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" text NOT NULL,
	"session_id" uuid,
	"state" "whatsapp_conversation_state" DEFAULT 'idle' NOT NULL,
	"incident_id" uuid,
	"context" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_conversation_states_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"notify_whatsapp" boolean DEFAULT true NOT NULL,
	"notify_new_incidents" boolean DEFAULT true NOT NULL,
	"notify_updates" boolean DEFAULT true NOT NULL,
	"notify_urgent_only" boolean DEFAULT false NOT NULL,
	"whatsapp_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_profile_id_unique" UNIQUE("user_profile_id")
);
--> statement-breakpoint
ALTER TABLE "incident_comments" ADD CONSTRAINT "incident_comments_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_comments" ADD CONSTRAINT "incident_comments_author_id_user_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_conversation_states" ADD CONSTRAINT "whatsapp_conversation_states_session_id_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_conversation_states" ADD CONSTRAINT "whatsapp_conversation_states_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;