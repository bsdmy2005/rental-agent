CREATE TABLE "account_beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_instruction_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"current_balance" numeric,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"last_synced_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_instruction_id" uuid NOT NULL,
	"beneficiary_id" text NOT NULL,
	"name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_code" text NOT NULL,
	"beneficiary_type" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"bank_provider" text NOT NULL,
	"encrypted_client_id" text NOT NULL,
	"encrypted_client_secret" text NOT NULL,
	"encrypted_api_key" text,
	"api_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payable_instance_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"my_reference" text NOT NULL,
	"their_reference" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"investec_transaction_id" text,
	"investec_response" jsonb,
	"error_message" text,
	"executed_at" timestamp,
	"executed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payable_templates" ADD COLUMN "bank_account_id" uuid;--> statement-breakpoint
ALTER TABLE "account_beneficiaries" ADD CONSTRAINT "account_beneficiaries_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_beneficiaries" ADD CONSTRAINT "account_beneficiaries_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_payment_instruction_id_payment_instructions_id_fk" FOREIGN KEY ("payment_instruction_id") REFERENCES "public"."payment_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_payment_instruction_id_payment_instructions_id_fk" FOREIGN KEY ("payment_instruction_id") REFERENCES "public"."payment_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_instructions" ADD CONSTRAINT "payment_instructions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payable_instance_id_payable_instances_id_fk" FOREIGN KEY ("payable_instance_id") REFERENCES "public"."payable_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payable_templates" ADD CONSTRAINT "payable_templates_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;