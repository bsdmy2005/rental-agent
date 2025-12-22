CREATE TABLE "bill_arrival_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_template_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"expected_day_of_month" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bill_type" "bill_type" NOT NULL,
	"extraction_rule_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payable_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"depends_on_bill_template_ids" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_invoice_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bill_template_id" uuid NOT NULL,
	"generation_day_of_month" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payable_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payable_template_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"contributing_bill_ids" jsonb,
	"payable_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rental_invoice_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rental_invoice_template_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"period_year" integer NOT NULL,
	"period_month" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"contributing_bill_ids" jsonb,
	"invoice_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payable_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payable_template_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"scheduled_day_of_month" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN "bill_template_id" uuid;--> statement-breakpoint
ALTER TABLE "bill_arrival_schedules" ADD CONSTRAINT "bill_arrival_schedules_bill_template_id_bill_templates_id_fk" FOREIGN KEY ("bill_template_id") REFERENCES "public"."bill_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_arrival_schedules" ADD CONSTRAINT "bill_arrival_schedules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_templates" ADD CONSTRAINT "bill_templates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_templates" ADD CONSTRAINT "bill_templates_extraction_rule_id_extraction_rules_id_fk" FOREIGN KEY ("extraction_rule_id") REFERENCES "public"."extraction_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_templates" ADD CONSTRAINT "payable_templates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD CONSTRAINT "rental_invoice_templates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD CONSTRAINT "rental_invoice_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_invoice_templates" ADD CONSTRAINT "rental_invoice_templates_bill_template_id_bill_templates_id_fk" FOREIGN KEY ("bill_template_id") REFERENCES "public"."bill_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_instances" ADD CONSTRAINT "payable_instances_payable_template_id_payable_templates_id_fk" FOREIGN KEY ("payable_template_id") REFERENCES "public"."payable_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_instances" ADD CONSTRAINT "payable_instances_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_invoice_instances" ADD CONSTRAINT "rental_invoice_instances_rental_invoice_template_id_rental_invoice_templates_id_fk" FOREIGN KEY ("rental_invoice_template_id") REFERENCES "public"."rental_invoice_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_invoice_instances" ADD CONSTRAINT "rental_invoice_instances_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_invoice_instances" ADD CONSTRAINT "rental_invoice_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_schedules" ADD CONSTRAINT "payable_schedules_payable_template_id_payable_templates_id_fk" FOREIGN KEY ("payable_template_id") REFERENCES "public"."payable_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_schedules" ADD CONSTRAINT "payable_schedules_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_bill_template_id_bill_templates_id_fk" FOREIGN KEY ("bill_template_id") REFERENCES "public"."bill_templates"("id") ON DELETE set null ON UPDATE no action;