"use client"

import { useRouter } from "next/navigation"
import { ModernRuleBuilder } from "../../_components/modern-rule-builder"
import { type SelectExtractionRule } from "@/db/schema"
import { type FieldMapping } from "../../_components/field-mapping-builder"

interface EditRuleBuilderWrapperProps {
  rule: SelectExtractionRule
  userProfileId: string
  properties: Array<{ id: string; name: string }>
}

/**
 * Convert extraction config JSON back to FieldMapping array
 * Config structure: { fieldMappings: { type: { label, patterns, extractUsage, ... } } }
 */
function convertConfigToMappings(config: Record<string, unknown> | null): FieldMapping[] {
  if (!config || typeof config !== "object") {
    return []
  }

  const mappings: FieldMapping[] = []
  let idCounter = 1

  // Check if config has fieldMappings property (structure from convertMappingsToConfig)
  const fieldMappings = (config.fieldMappings as Record<string, unknown>) || config

  for (const [key, value] of Object.entries(fieldMappings)) {
    if (value && typeof value === "object" && "label" in value) {
      const mappingValue = value as {
        label?: string
        patterns?: string[]
        extractUsage?: boolean
        extractBeneficiary?: boolean
        extractAccountNumber?: boolean
      }

      mappings.push({
        id: String(idCounter++),
        type: key,
        label: mappingValue.label || key,
        patterns: mappingValue.patterns || [],
        extractUsage: mappingValue.extractUsage || false,
        extractBeneficiary: mappingValue.extractBeneficiary || false,
        extractAccountNumber: mappingValue.extractAccountNumber || false
      })
    }
  }

  return mappings
}

export function EditRuleBuilderWrapper({
  rule,
  userProfileId,
  properties
}: EditRuleBuilderWrapperProps) {
  const router = useRouter()

  // Extract lane3Config data
  const lane3Config = (rule.lane3Config as
    | {
        method?: string
        agenticConfig?: {
          maxSteps?: number
          maxTime?: number
          allowedDomains?: string[]
          portalContext?: string
        }
      }
    | null) || {}

  const agenticConfig = lane3Config.agenticConfig || {}

  // Extract lane2Config data
  const lane2Config = (rule.lane2Config as
    | {
        followRedirects?: boolean
        maxRedirects?: number
      }
    | null) || {}

  // Convert rule data to form data format
  const initialFormData = {
    propertyId: rule.propertyId,
    name: rule.name,
    extractForInvoice: rule.extractForInvoice,
    extractForPayment: rule.extractForPayment,
    billType: rule.billType,
    channel: rule.channel,
    emailFilterFrom: (rule.emailFilter as { from?: string } | null)?.from || "",
    emailFilterSubject: (rule.emailFilter as { subject?: string } | null)?.subject || "",
    emailProcessingInstruction: rule.emailProcessingInstruction || "",
    invoiceFieldMappings: rule.invoiceExtractionConfig
      ? convertConfigToMappings(rule.invoiceExtractionConfig as Record<string, unknown>)
      : [],
    paymentFieldMappings: rule.paymentExtractionConfig
      ? convertConfigToMappings(rule.paymentExtractionConfig as Record<string, unknown>)
      : [],
    invoiceInstruction: rule.invoiceInstruction || "",
    paymentInstruction: rule.paymentInstruction || "",
    preferredLane: rule.preferredLane || "auto",
    lane2FollowRedirects: lane2Config.followRedirects ?? true,
    lane2MaxRedirects: lane2Config.maxRedirects || 5,
    lane3Method: lane3Config.method || "agentic",
    lane3AgenticMaxSteps: agenticConfig.maxSteps || 50,
    lane3AgenticMaxTime: agenticConfig.maxTime || 120,
    lane3AgenticAllowedDomains: agenticConfig.allowedDomains?.join(", ") || "",
    lane3AgenticPortalContext: agenticConfig.portalContext || ""
  }

  const handleSuccess = () => {
    router.push(`/dashboard/rules/${rule.id}`)
    router.refresh()
  }

  return (
    <ModernRuleBuilder
      userProfileId={userProfileId}
      properties={properties}
      initialRule={rule}
      initialFormData={initialFormData}
      onSuccess={handleSuccess}
    />
  )
}

