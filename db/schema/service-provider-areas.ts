import { pgTable, text, uuid } from "drizzle-orm/pg-core"
import { serviceProvidersTable } from "./service-providers"

export const serviceProviderAreasTable = pgTable("service_provider_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceProviderId: uuid("service_provider_id")
    .references(() => serviceProvidersTable.id, { onDelete: "cascade" })
    .notNull(),
  suburb: text("suburb").notNull(), // Required - service providers must be tied to neighborhoods
  city: text("city"), // city name for better filtering
  province: text("province").notNull(),
  country: text("country").default("South Africa").notNull()
})

export type InsertServiceProviderArea = typeof serviceProviderAreasTable.$inferInsert
export type SelectServiceProviderArea = typeof serviceProviderAreasTable.$inferSelect

