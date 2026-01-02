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
  isLocked: boolean("is_locked").default(false).notNull(), // Structure locked after wizard completion
  componentConfiguration: jsonb("component_configuration"), // Stores component selections: {bedrooms: 3, lounges: 1, pool: true, etc.}
  tenantAccessToken: text("tenant_access_token"), // Secure token for tenant access link
  inspectorAccessToken: text("inspector_access_token"), // Secure token for third-party inspector access
  inspectorSignatureData: jsonb("inspector_signature_data"), // Third-party inspector signature
  inspectorName: text("inspector_name"), // Third-party inspector name
  inspectorEmail: text("inspector_email"), // Third-party inspector email
  inspectorCompany: text("inspector_company"), // Third-party inspector company
  inspectorPhone: text("inspector_phone"), // Third-party inspector phone
  signedByInspector: boolean("signed_by_inspector").default(false).notNull(), // Whether inspector has signed
  inspectedByThirdParty: boolean("inspected_by_third_party").default(false).notNull(), // Whether inspection was conducted by third-party
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertMovingInspection = typeof movingInspectionsTable.$inferInsert
export type SelectMovingInspection = typeof movingInspectionsTable.$inferSelect

