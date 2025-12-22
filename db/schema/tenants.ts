import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { userProfilesTable } from "./user-profiles"
import { leaseAgreementsTable } from "./lease-agreements"

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }),
  leaseAgreementId: uuid("lease_agreement_id").references(() => leaseAgreementsTable.id, {
    onDelete: "set null"
  }), // Reference to lease agreement
  name: text("name").notNull(),
  idNumber: text("id_number").notNull(), // Required: ID number or passport number (unique identifier)
  email: text("email"),
  phone: text("phone"),
  rentalAmount: numeric("rental_amount"), // Monthly rental amount per tenant (optional)
  leaseStartDate: timestamp("lease_start_date"), // Kept for backward compatibility (sync with effective dates)
  leaseEndDate: timestamp("lease_end_date"), // Kept for backward compatibility (sync with effective dates)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertTenant = typeof tenantsTable.$inferInsert
export type SelectTenant = typeof tenantsTable.$inferSelect

