import { pgEnum } from "drizzle-orm/pg-core"

export const userTypeEnum = pgEnum("user_type", ["landlord", "rental_agent", "tenant", "admin"])
export const billTypeEnum = pgEnum("bill_type", ["municipality", "levy", "utility", "other"])
export const sourceEnum = pgEnum("source", ["email", "manual_upload"])
export const channelEnum = pgEnum("channel", ["email_forward", "manual_upload"])
export const statusEnum = pgEnum("status", ["pending", "processing", "processed", "error"])

