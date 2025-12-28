import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"
import { userProfilesTable } from "./user-profiles"

export const propertyCodesTable = pgTable("property_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  code: text("code").notNull().unique(), // Unique property code (e.g., "PROP-ABC123")
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => userProfilesTable.id, {
    onDelete: "set null"
  }),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPropertyCode = typeof propertyCodesTable.$inferInsert
export type SelectPropertyCode = typeof propertyCodesTable.$inferSelect

