import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { landlordsTable } from "./landlords"
import { paymentModelEnum } from "./enums"

export const propertiesTable = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  landlordId: uuid("landlord_id")
    .references(() => landlordsTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  address: text("address"), // Optional for backward compatibility, can be auto-generated
  streetAddress: text("street_address").notNull(),
  suburb: text("suburb").notNull(),
  province: text("province").notNull(),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  propertyType: text("property_type"),
  paymentModel: paymentModelEnum("payment_model").default("prepaid").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertProperty = typeof propertiesTable.$inferInsert
export type SelectProperty = typeof propertiesTable.$inferSelect

