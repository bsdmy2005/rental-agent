import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { quoteRequestsTable } from "./quote-requests"

export const rfqCodesTable = pgTable("rfq_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  rfqId: uuid("rfq_id")
    .references(() => quoteRequestsTable.id, { onDelete: "cascade" })
    .notNull(),
  code: text("code").unique().notNull(), // RFQ-XXXXXX format
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  usageLimit: integer("usage_limit"), // null = unlimited
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertRfqCode = typeof rfqCodesTable.$inferInsert
export type SelectRfqCode = typeof rfqCodesTable.$inferSelect

