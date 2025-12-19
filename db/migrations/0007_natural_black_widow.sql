CREATE TYPE "public"."frequency" AS ENUM('monthly', 'weekly', 'once');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('pending', 'on_time', 'late', 'missed');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('bill_input', 'invoice_output', 'payable_output');--> statement-breakpoint
CREATE TABLE "billing_schedule_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"expected_date" timestamp NOT NULL,
	"actual_date" timestamp,
	"status" "schedule_status" DEFAULT 'pending' NOT NULL,
	"bill_id" uuid,
	"invoice_id" uuid,
	"payable_id" uuid,
	"days_late" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"schedule_type" "schedule_type" NOT NULL,
	"bill_type" "bill_type",
	"frequency" "frequency" NOT NULL,
	"expected_day_of_month" integer,
	"expected_day_of_week" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"extraction_rule_id" uuid,
	"email_filter" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_schedule_status" ADD CONSTRAINT "billing_schedule_status_schedule_id_billing_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."billing_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_schedule_status" ADD CONSTRAINT "billing_schedule_status_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_extraction_rule_id_extraction_rules_id_fk" FOREIGN KEY ("extraction_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE no action ON UPDATE no action;