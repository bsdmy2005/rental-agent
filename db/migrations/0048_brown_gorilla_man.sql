ALTER TABLE "quote_requests" ADD COLUMN "bulk_rfq_group_id" uuid;--> statement-breakpoint
CREATE INDEX "bulk_rfq_group_id_idx" ON "quote_requests" USING btree ("bulk_rfq_group_id");