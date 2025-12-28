import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userProfilesTable } from "./user-profiles"
import { serviceProviderSpecializationEnum } from "./enums"

export const serviceProvidersTable = pgTable("service_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessName: text("business_name"),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"), // For future WhatsApp integration
  email: text("email").notNull(),
  specialization: serviceProviderSpecializationEnum("specialization"),
  licenseNumber: text("license_number"),
  insuranceInfo: text("insurance_info"), // JSON or text description
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by")
    .references(() => userProfilesTable.id, { onDelete: "set null" })
    .notNull(), // Landlord or agent who added them
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertServiceProvider = typeof serviceProvidersTable.$inferInsert
export type SelectServiceProvider = typeof serviceProvidersTable.$inferSelect

