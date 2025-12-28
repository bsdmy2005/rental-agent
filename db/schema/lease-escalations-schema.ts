import { boolean, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { leaseAgreementsTable } from "./lease-agreements"
import { escalationTypeEnum } from "./enums"

export const leaseEscalationsTable = pgTable("lease_escalations", {
  id: uuid("id").defaultRandom().primaryKey(),
  leaseAgreementId: uuid("lease_agreement_id")
    .references(() => leaseAgreementsTable.id, { onDelete: "cascade" })
    .notNull(),
  escalationDate: timestamp("escalation_date").notNull(),
  previousAmount: numeric("previous_amount").notNull(),
  newAmount: numeric("new_amount").notNull(),
  escalationType: escalationTypeEnum("escalation_type").notNull(),
  escalationValue: numeric("escalation_value").notNull(),
  documentFileUrl: text("document_file_url"),
  documentFileName: text("document_file_name"),
  signedByTenant: boolean("signed_by_tenant").default(false).notNull(),
  signedByLandlord: boolean("signed_by_landlord").default(false).notNull(),
  signedAt: timestamp("signed_at"),
  tenantSignatureData: jsonb("tenant_signature_data"),
  landlordSignatureData: jsonb("landlord_signature_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertLeaseEscalation = typeof leaseEscalationsTable.$inferInsert
export type SelectLeaseEscalation = typeof leaseEscalationsTable.$inferSelect

