import { pgEnum } from "drizzle-orm/pg-core"

export const userTypeEnum = pgEnum("user_type", ["landlord", "rental_agent", "tenant", "admin"])
export const billTypeEnum = pgEnum("bill_type", ["municipality", "levy", "utility", "other"])
export const sourceEnum = pgEnum("source", ["email", "manual_upload"])
export const channelEnum = pgEnum("channel", ["email_forward", "manual_upload", "agentic"])
export const scheduleSourceEnum = pgEnum("schedule_source", ["manual_upload", "email", "agentic"])
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
export const scheduleTypeEnum = pgEnum("schedule_type", [
  "bill_input",
  "invoice_output",
  "payable_output"
])
export const frequencyEnum = pgEnum("frequency", ["monthly", "weekly", "once"])
export const scheduleStatusEnum = pgEnum("schedule_status", [
  "pending",
  "on_time",
  "late",
  "missed",
  "blocked",
  "generated",
  "sent"
])
export const extractionJobStatusEnum = pgEnum("extraction_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "escalated"
])
export const extractionJobLaneEnum = pgEnum("extraction_job_lane", [
  "lane1_attachments",
  "lane2_direct",
  "lane3_interactive",
  "unknown"
])
export const expenseCategoryEnum = pgEnum("expense_category", [
  "maintenance",
  "repairs",
  "insurance",
  "property_management_fees",
  "municipal_rates_taxes",
  "interest_mortgage_bonds",
  "advertising",
  "legal_fees",
  "cleaning",
  "gardening",
  "utilities",
  "other"
])
export const incidentPriorityEnum = pgEnum("incident_priority", [
  "low",
  "medium",
  "high",
  "urgent"
])
export const incidentStatusEnum = pgEnum("incident_status", [
  "reported",
  "assigned",
  "in_progress",
  "awaiting_quote",
  "awaiting_approval",
  "resolved",
  "closed"
])
export const serviceProviderSpecializationEnum = pgEnum("service_provider_specialization", [
  "plumbing",
  "electrical",
  "hvac",
  "general_maintenance",
  "painting",
  "carpentry",
  "roofing",
  "other"
])
export const quoteStatusEnum = pgEnum("quote_status", [
  "requested",
  "quoted",
  "approved",
  "rejected",
  "expired"
])
export const quoteSubmissionMethodEnum = pgEnum("quote_submission_method", [
  "email",
  "web_form",
  "whatsapp"
])
export const depreciationMethodEnum = pgEnum("depreciation_method", [
  "straight_line",
  "declining_balance"
])
export const incidentSubmissionMethodEnum = pgEnum("incident_submission_method", [
  "web",
  "whatsapp",
  "sms",
  "email"
])
export const leaseLifecycleStateEnum = pgEnum("lease_lifecycle_state", [
  "waiting",
  "signed",
  "moving_in_pending",
  "active",
  "escalation_due",
  "moving_out_pending",
  "completed"
])
export const escalationTypeEnum = pgEnum("escalation_type", [
  "percentage",
  "fixed_amount",
  "cpi",
  "none"
])
export const inspectionTypeEnum = pgEnum("inspection_type", [
  "moving_in",
  "moving_out"
])
export const inspectionStatusEnum = pgEnum("inspection_status", [
  "draft",
  "in_progress",
  "completed",
  "signed"
])
export const itemConditionEnum = pgEnum("item_condition", [
  "good",
  "requires_repair",
  "requires_cleaning",
  "requires_repair_and_cleaning"
])
export const defectSeverityEnum = pgEnum("defect_severity", [
  "minor",
  "moderate",
  "major"
])
export const attachmentTypeEnum = pgEnum("attachment_type", [
  "photo",
  "document"
])
export const extractionStatusEnum = pgEnum("extraction_status", [
  "pending",
  "completed",
  "failed"
])
export const conditionChangeEnum = pgEnum("condition_change", [
  "improved",
  "same",
  "deteriorated",
  "new_defect"
])
export const leaseInitiationMethodEnum = pgEnum("lease_initiation_method", [
  "upload_existing",
  "initiate_new"
])
export const leaseInitiationStatusEnum = pgEnum("lease_initiation_status", [
  "draft",
  "sent_to_landlord",
  "landlord_signed",
  "sent_to_tenant",
  "tenant_signed",
  "fully_executed"
])
export const whatsappConnectionStatusEnum = pgEnum("whatsapp_connection_status", [
  "disconnected",
  "connecting",
  "qr_pending",
  "connected",
  "logged_out"
])
export const whatsappConversationStateEnum = pgEnum("whatsapp_conversation_state", [
  "idle",
  "awaiting_email",
  "awaiting_otp",
  "awaiting_property",
  "awaiting_description",
  "awaiting_photos",
  "incident_active",
  "awaiting_closure_confirmation",
  "awaiting_incident_selection",
  "awaiting_new_incident_confirmation",
  "awaiting_follow_up_confirmation",
  "awaiting_update_or_closure"
])
export const incidentAuthorTypeEnum = pgEnum("incident_author_type", [
  "tenant",
  "agent",
  "landlord",
  "system"
])
export const agencyMembershipStatusEnum = pgEnum("agency_membership_status", [
  "pending",
  "approved",
  "rejected",
  "removed"
])
export const agencyAdminRoleEnum = pgEnum("agency_admin_role", [
  "owner",
  "admin"
])

