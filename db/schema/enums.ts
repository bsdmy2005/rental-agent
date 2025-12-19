import { pgEnum } from "drizzle-orm/pg-core"

export const userTypeEnum = pgEnum("user_type", ["landlord", "rental_agent", "tenant", "admin"])
export const billTypeEnum = pgEnum("bill_type", ["municipality", "levy", "utility", "other"])
export const sourceEnum = pgEnum("source", ["email", "manual_upload"])
export const channelEnum = pgEnum("channel", ["email_forward", "manual_upload"])
export const statusEnum = pgEnum("status", ["pending", "processing", "processed", "error"])
export const paymentModelEnum = pgEnum("payment_model", ["prepaid", "postpaid"])
export const fixedCostTypeEnum = pgEnum("fixed_cost_type", [
  "rent",
  "refuse_removal",
  "solar",
  "parking",
  "levy",
  "estimated_water",
  "estimated_electricity",
  "other"
])
export const variableCostTypeEnum = pgEnum("variable_cost_type", [
  "water",
  "electricity",
  "sewerage",
  "other"
])
export const extractionPurposeEnum = pgEnum("extraction_purpose", [
  "invoice_generation",
  "payment_processing"
])

