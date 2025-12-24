import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { propertiesTable } from "./properties"

/**
 * Payment Instructions Schema
 *
 * Stores encrypted payment provider credentials per property.
 * Credentials are encrypted at rest using AES-256-GCM encryption.
 */
export const paymentInstructionsTable = pgTable("payment_instructions", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => propertiesTable.id, { onDelete: "cascade" })
    .notNull(),
  bankProvider: text("bank_provider").notNull(), // "investec" (enum in future)
  // Encrypted credentials - stored as ciphertext
  encryptedClientId: text("encrypted_client_id").notNull(),
  encryptedClientSecret: text("encrypted_client_secret").notNull(),
  encryptedApiKey: text("encrypted_api_key"), // Optional
  apiUrl: text("api_url"), // Optional, defaults to production
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertPaymentInstruction = typeof paymentInstructionsTable.$inferInsert
export type SelectPaymentInstruction = typeof paymentInstructionsTable.$inferSelect

