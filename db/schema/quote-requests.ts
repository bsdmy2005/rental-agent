import { integer, pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core"
import { incidentsTable } from "./incidents"
import { propertiesTable } from "./properties"
import { serviceProvidersTable } from "./service-providers"
import { userProfilesTable } from "./user-profiles"
import { quoteStatusEnum } from "./enums"

export const quoteRequestsTable = pgTable(
  "quote_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .references(() => incidentsTable.id, { onDelete: "cascade" }), // Nullable to allow standalone RFQs
    propertyId: uuid("property_id")
      .references(() => propertiesTable.id, { onDelete: "cascade" }), // Temporarily nullable for migration - will be made NOT NULL after data migration
    serviceProviderId: uuid("service_provider_id")
      .references(() => serviceProvidersTable.id, { onDelete: "cascade" })
      .notNull(),
    requestedBy: uuid("requested_by")
      .references(() => userProfilesTable.id, { onDelete: "set null" })
      .notNull(), // Agent or landlord who requested
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    dueDate: timestamp("due_date"), // Optional deadline for quote
    status: quoteStatusEnum("status").default("requested").notNull(),
    notes: text("notes"), // Additional notes for the provider
    // Standalone RFQ fields
    title: text("title"), // Nullable, for standalone RFQs
    description: text("description"), // Nullable, for standalone RFQs
    rfqCode: text("rfq_code").unique(), // Unique code (RFQ-XXXXXX)
    completedAt: timestamp("completed_at"), // Track when quote work is completed
    sentCount: integer("sent_count").default(0).notNull(), // Track how many providers RFQ was sent to
    receivedCount: integer("received_count").default(0).notNull(), // Track how many quotes received
    // Email and communication fields
    uniqueEmailAddress: text("unique_email_address").notNull(), // Unique email for this RFQ (quote-{id}@domain)
    emailMessageId: text("email_message_id"), // Postmark message ID for tracking replies
    whatsappCode: text("whatsapp_code"), // Unique code (RFQ-XXXXXX) for WhatsApp submissions
    whatsappMessageId: text("whatsapp_message_id"), // Twilio message SID for tracking
    whatsappSentAt: timestamp("whatsapp_sent_at"), // When WhatsApp message was sent
    // Bulk RFQ grouping
    bulkRfqGroupId: uuid("bulk_rfq_group_id") // Self-reference: groups RFQs from the same bulk request. First RFQ has null (becomes parent), others reference it. Foreign key constraint handled at application level.
  },
  (table) => ({
    bulkRfqGroupIdIdx: index("bulk_rfq_group_id_idx").on(table.bulkRfqGroupId)
  })
)

export type InsertQuoteRequest = typeof quoteRequestsTable.$inferInsert
export type SelectQuoteRequest = typeof quoteRequestsTable.$inferSelect

