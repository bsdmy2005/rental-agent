CREATE TYPE "public"."whatsapp_connection_status" AS ENUM('disconnected', 'connecting', 'qr_pending', 'connected', 'logged_out');--> statement-breakpoint
CREATE TABLE "whatsapp_explorer_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"message_id" text NOT NULL,
	"remote_jid" text NOT NULL,
	"from_me" boolean NOT NULL,
	"message_type" text NOT NULL,
	"content" text,
	"media_url" text,
	"status" text,
	"status_updated_at" timestamp,
	"timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"session_name" text DEFAULT 'default' NOT NULL,
	"phone_number" text,
	"connection_status" "whatsapp_connection_status" DEFAULT 'disconnected' NOT NULL,
	"last_connected_at" timestamp,
	"last_disconnected_at" timestamp,
	"auth_state" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_explorer_messages" ADD CONSTRAINT "whatsapp_explorer_messages_session_id_whatsapp_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."whatsapp_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;