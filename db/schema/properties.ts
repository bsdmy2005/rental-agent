import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
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
  // Banking details for payment instructions
  bankName: text("bank_name"),
  accountHolderName: text("account_holder_name"),
  accountNumber: text("account_number"),
  branchCode: text("branch_code"),
  swiftCode: text("swift_code"),
  referenceFormat: text("reference_format"),
  // Public incident submission fields
  incidentSubmissionEnabled: boolean("incident_submission_enabled").default(true).notNull(),
  incidentSubmissionPhone: text("incident_submission_phone"), // Optional WhatsApp number for property
  // Landlord contact details (stored on property for contracts and communication)
  // These are required when property is managed by rental agent, but always populated
  landlordName: text("landlord_name"), // Full name or company name
  landlordEmail: text("landlord_email"), // Contact email for contracts and communication
  landlordPhone: text("landlord_phone"), // Contact phone number
  landlordIdNumber: text("landlord_id_number"), // ID/Registration number for contracts
  landlordAddress: text("landlord_address"), // Full address for contracts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertProperty = typeof propertiesTable.$inferInsert
export type SelectProperty = typeof propertiesTable.$inferSelect

