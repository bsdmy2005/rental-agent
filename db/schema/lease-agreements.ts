import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { tenantsTable } from "./tenants"
import { propertiesTable } from "./properties"

export const leaseAgreementsTable = pgTable("lease_agreements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" })
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  extractedStartDate: timestamp("extracted_start_date"), // Extracted from PDF
  extractedEndDate: timestamp("extracted_end_date"), // Extracted from PDF
  manualStartDate: timestamp("manual_start_date"), // Manual override
  manualEndDate: timestamp("manual_end_date"), // Manual override
  effectiveStartDate: timestamp("effective_start_date").notNull(), // Final date used (manual or extracted)
  effectiveEndDate: timestamp("effective_end_date").notNull(), // Final date used (manual or extracted)
  extractionData: jsonb("extraction_data"), // Full extracted data from lease
  status: text("status").default("pending").notNull(), // pending, processed, error
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertLeaseAgreement = typeof leaseAgreementsTable.$inferInsert
export type SelectLeaseAgreement = typeof leaseAgreementsTable.$inferSelect

