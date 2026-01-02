ALTER TABLE "moving_inspection_items" ALTER COLUMN "condition" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "moving_inspection_items" ALTER COLUMN "condition" DROP NOT NULL;