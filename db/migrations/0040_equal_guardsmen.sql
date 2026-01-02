ALTER TABLE "moving_inspections" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "component_configuration" jsonb;--> statement-breakpoint
ALTER TABLE "moving_inspections" ADD COLUMN "tenant_access_token" text;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ADD COLUMN "is_present" boolean;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ADD COLUMN "room_instance_number" integer;--> statement-breakpoint
ALTER TABLE "moving_inspection_defects" ADD COLUMN "is_repairable" boolean DEFAULT true NOT NULL;