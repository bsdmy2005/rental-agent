import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { landlordsTable } from "./landlords"

export const propertiesTable = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  landlordId: uuid("landlord_id")
    .references(() => landlordsTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  propertyType: text("property_type"),
  rentalAmount: numeric("rental_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertProperty = typeof propertiesTable.$inferInsert
export type SelectProperty = typeof propertiesTable.$inferSelect

