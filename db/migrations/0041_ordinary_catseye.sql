ALTER TABLE "moving_inspection_items" ALTER COLUMN "condition" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ALTER COLUMN "condition" SET DEFAULT 'good'::text;--> statement-breakpoint
DROP TYPE "public"."item_condition";--> statement-breakpoint
CREATE TYPE "public"."item_condition" AS ENUM('good', 'requires_repair', 'requires_cleaning', 'requires_repair_and_cleaning');--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ALTER COLUMN "condition" SET DEFAULT 'good'::"public"."item_condition";--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ALTER COLUMN "condition" SET DATA TYPE "public"."item_condition" USING "condition"::"public"."item_condition";--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ADD COLUMN "confirmed_as_previous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ADD COLUMN "move_in_item_id" uuid;