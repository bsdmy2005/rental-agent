ALTER TYPE "public"."schedule_status" ADD VALUE 'blocked';--> statement-breakpoint
ALTER TABLE "billing_schedule_status" ADD COLUMN "blocked_by" jsonb;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD COLUMN "wait_for_bills" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD COLUMN "depends_on_bill_schedules" jsonb;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD COLUMN "dependency_logic" jsonb;