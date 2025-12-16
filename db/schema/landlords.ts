import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"

export const landlordsTable = pgTable("landlords", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfilesTable.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  companyName: text("company_name"),
  registrationNumber: text("registration_number"),
  taxId: text("tax_id"),
  address: text("address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertLandlord = typeof landlordsTable.$inferInsert
export type SelectLandlord = typeof landlordsTable.$inferSelect

