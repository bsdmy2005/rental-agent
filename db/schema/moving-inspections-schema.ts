import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { leaseAgreementsTable } from "./lease-agreements"
import { inspectionTypeEnum, inspectionStatusEnum } from "./enums"

export const movingInspectionsTable = pgTable("moving_inspections", {
  id: uuid("id").defaultRandom().primaryKey(),
  leaseAgreementId: uuid("lease_agreement_id")
    .references(() => leaseAgreementsTable.id, { onDelete: "cascade" })
    .notNull(),
  inspectionType: inspectionTypeEnum("inspection_type").notNull(),
  status: inspectionStatusEnum("status").default("draft").notNull(),
  inspectedBy: text("inspected_by").notNull(), // user_id of rental agent
  signedByTenant: boolean("signed_by_tenant").default(false).notNull(),
  signedByLandlord: boolean("signed_by_landlord").default(false).notNull(),
  signedAt: timestamp("signed_at"),
  tenantSignatureData: jsonb("tenant_signature_data"),
  landlordSignatureData: jsonb("landlord_signature_data"),
  tenantNotes: text("tenant_notes"),
  landlordNotes: text("landlord_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspection = typeof movingInspectionsTable.$inferInsert
export type SelectMovingInspection = typeof movingInspectionsTable.$inferSelect

