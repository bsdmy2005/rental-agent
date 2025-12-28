CREATE TYPE "public"."extraction_job_lane" AS ENUM('lane1_attachments', 'lane2_direct', 'lane3_interactive', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."extraction_job_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'escalated');--> statement-breakpoint
CREATE TABLE "extraction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_processor_id" uuid NOT NULL,
	"extraction_rule_id" uuid,
	"status" "extraction_job_status" DEFAULT 'pending' NOT NULL,
	"lane" "extraction_job_lane" DEFAULT 'unknown' NOT NULL,
	"trace" jsonb,
	"result" jsonb,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "preferred_lane" text DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "lane3_config" jsonb;--> statement-breakpoint
ALTER TABLE "extraction_rules" ADD COLUMN "lane2_config" jsonb;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_email_processor_id_email_processors_id_fk" FOREIGN KEY ("email_processor_id") REFERENCES "public"."email_processors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_extraction_rule_id_extraction_rules_id_fk" FOREIGN KEY ("extraction_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE set null ON UPDATE no action;