import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Rate limiting table for WhatsApp incident submissions
 * Prevents spam by tracking submissions per phone number
 */
export const whatsappIncidentRateLimitsTable = pgTable("whatsapp_incident_rate_limits", {
  phoneNumber: text("phone_number").primaryKey(), // Normalized phone number (27... format)
  submissionCount: integer("submission_count").default(0).notNull(), // Count in current window
  windowStart: timestamp("window_start").defaultNow().notNull(), // Start of current rate limit window
  lastSubmissionAt: timestamp("last_submission_at"), // Timestamp of last submission
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertWhatsappIncidentRateLimit = typeof whatsappIncidentRateLimitsTable.$inferInsert
export type SelectWhatsappIncidentRateLimit = typeof whatsappIncidentRateLimitsTable.$inferSelect

