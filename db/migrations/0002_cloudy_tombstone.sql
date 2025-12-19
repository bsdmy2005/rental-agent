CREATE TYPE "public"."fixed_cost_type" AS ENUM('rent', 'refuse_removal', 'solar', 'parking', 'levy', 'estimated_water', 'estimated_electricity', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_model" AS ENUM('prepaid', 'postpaid');--> statement-breakpoint
CREATE TYPE "public"."variable_cost_type" AS ENUM('water', 'electricity', 'sewerage', 'other');--> statement-breakpoint
CREATE TABLE "fixed_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cost_type" "fixed_cost_type" NOT NULL,
	"amount" numeric NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variable_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"bill_id" uuid NOT NULL,
	"cost_type" "variable_cost_type" NOT NULL,
	"amount" numeric NOT NULL,
	"usage" numeric,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"reading_date" timestamp,
	"extraction_rule_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variable_cost_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variable_cost_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"rental_amount" numeric NOT NULL,
	"total_rental_amount" numeric NOT NULL,
	"allocation_ratio" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "payment_model" "payment_model" DEFAULT 'prepaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "fixed_costs" ADD CONSTRAINT "fixed_costs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_costs" ADD CONSTRAINT "variable_costs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_costs" ADD CONSTRAINT "variable_costs_bill_id_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_costs" ADD CONSTRAINT "variable_costs_extraction_rule_id_extraction_rules_id_fk" FOREIGN KEY ("extraction_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_cost_allocations" ADD CONSTRAINT "variable_cost_allocations_variable_cost_id_variable_costs_id_fk" FOREIGN KEY ("variable_cost_id") REFERENCES "public"."variable_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_cost_allocations" ADD CONSTRAINT "variable_cost_allocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;