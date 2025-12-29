ALTER TABLE "whatsapp_explorer_messages" ADD COLUMN "incident_id" uuid;--> statement-breakpoint
ALTER TABLE "whatsapp_explorer_messages" ADD COLUMN "message_classification" text;--> statement-breakpoint
ALTER TABLE "whatsapp_explorer_messages" ADD COLUMN "classified_at" timestamp;--> statement-breakpoint
ALTER TABLE "whatsapp_explorer_messages" ADD CONSTRAINT "whatsapp_explorer_messages_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;