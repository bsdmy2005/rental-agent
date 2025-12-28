import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { tenantsTable } from "./tenants"
import { userProfilesTable } from "./user-profiles"
import { incidentPriorityEnum, incidentStatusEnum, incidentSubmissionMethodEnum } from "./enums"

export const incidentsTable = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  tenantId: uuid("tenant_id")
    .references(() => tenantsTable.id, { onDelete: "cascade" }), // Nullable by default for anonymous submissions
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: incidentPriorityEnum("priority").default("medium").notNull(),
  status: incidentStatusEnum("status").default("reported").notNull(),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: uuid("assigned_to").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }), // Agent or landlord assigned to handle
  // Public submission fields
  submissionMethod: incidentSubmissionMethodEnum("submission_method").default("web").notNull(),
  submittedPhone: text("submitted_phone"), // Phone number used for submission
  submittedName: text("submitted_name"), // Name provided by tenant
  verificationCode: text("verification_code"), // SMS verification code (optional)
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertIncident = typeof incidentsTable.$inferInsert
export type SelectIncident = typeof incidentsTable.$inferSelect

