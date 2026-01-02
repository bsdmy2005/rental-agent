import { boolean, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { leaseLifecycleStateEnum, escalationTypeEnum, leaseInitiationMethodEnum, leaseInitiationStatusEnum } from "./enums"

export const leaseAgreementsTable = pgTable("lease_agreements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => require("./tenants").tenantsTable.id, { onDelete: "cascade" })
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
  // Initiation fields
  initiationMethod: leaseInitiationMethodEnum("initiation_method").default("upload_existing").notNull(),
  initiationStatus: leaseInitiationStatusEnum("initiation_status"), // For initiated leases: draft, sent_to_tenant, etc.
  draftPdfUrl: text("draft_pdf_url"), // URL to draft PDF before signing
  finalPdfUrl: text("final_pdf_url"), // URL to final signed PDF
  tenantSigningLink: text("tenant_signing_link"), // Unique link for tenant to sign
  tenantSigningToken: text("tenant_signing_token"), // Secure token for signing link
  tenantSigningExpiresAt: timestamp("tenant_signing_expires_at"), // Expiry for signing link
  landlordSigningLink: text("landlord_signing_link"), // Unique link for landlord to sign
  landlordSigningToken: text("landlord_signing_token"), // Secure token for landlord signing link
  landlordSigningExpiresAt: timestamp("landlord_signing_expires_at"), // Expiry for landlord signing link
  initiatedAt: timestamp("initiated_at"), // When lease initiation started
  tenantCompletedAt: timestamp("tenant_completed_at"), // When tenant completed their part
  landlordCompletedAt: timestamp("landlord_completed_at"), // When landlord completed their part
  // Lifecycle fields
  lifecycleState: leaseLifecycleStateEnum("lifecycle_state").default("waiting").notNull(),
  signedByTenant: boolean("signed_by_tenant").default(false).notNull(),
  signedByLandlord: boolean("signed_by_landlord").default(false).notNull(),
  signedAt: timestamp("signed_at"),
  tenantSignatureData: jsonb("tenant_signature_data"), // Stores signature image/data
  landlordSignatureData: jsonb("landlord_signature_data"),
  // Escalation fields
  escalationType: escalationTypeEnum("escalation_type").default("none").notNull(),
  escalationPercentage: numeric("escalation_percentage"),
  escalationFixedAmount: numeric("escalation_fixed_amount"),
  nextEscalationDate: timestamp("next_escalation_date"),
  escalationFrequencyMonths: numeric("escalation_frequency_months"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertLeaseAgreement = typeof leaseAgreementsTable.$inferInsert
export type SelectLeaseAgreement = typeof leaseAgreementsTable.$inferSelect

