"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { ModernRuleBuilder } from "./modern-rule-builder"
import { type SelectExtractionRule } from "@/db/schema"
import { type FieldMapping } from "./field-mapping-builder"
import { Skeleton } from "@/components/ui/skeleton"

interface DuplicateRuleDialogProps {
  ruleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfileId: string
  properties: Array<{ id: string; name: string }>
}

/**
 * Convert extraction config JSON back to FieldMapping array
 */
function convertConfigToMappings(config: Record<string, unknown> | null): FieldMapping[] {
  if (!config || typeof config !== "object") {
    return []
  }

  const mappings: FieldMapping[] = []
  let idCounter = 1

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

export function DuplicateRuleDialog({
  ruleId,
  open,
  onOpenChange,
  userProfileId,
  properties
}: DuplicateRuleDialogProps) {
  const router = useRouter()
  const [rule, setRule] = useState<SelectExtractionRule | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && ruleId) {
      setLoading(true)
      // Fetch rule data
      fetch(`/api/rules/${ruleId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.rule) {
            setRule(data.rule)
          }
        })
        .catch((error) => {
          console.error("Failed to fetch rule:", error)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setRule(null)
    }
  }, [open, ruleId])

  const handleSuccess = () => {
    onOpenChange(false)
    router.refresh()
  }

  // Convert rule data to form data format (without name - user will enter new name)
  const initialFormData = rule
    ? {
        propertyId: rule.propertyId,
        name: "", // Empty name - user must provide new name
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
        paymentInstruction: rule.paymentInstruction || ""
      }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Duplicate Rule</DialogTitle>
          <DialogDescription>
            Create a copy of this rule. All settings will be copied except the name - please provide a new name for the duplicated rule.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : rule && initialFormData ? (
          <ModernRuleBuilder
            userProfileId={userProfileId}
            properties={properties}
            initialFormData={initialFormData}
            onSuccess={handleSuccess}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Failed to load rule data
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

