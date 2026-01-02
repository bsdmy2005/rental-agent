"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TemplateField } from "@/lib/utils/template-helpers"

interface TemplateFieldsFormProps {
  fields: TemplateField[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
}

// Predefined field IDs that are already handled by the existing form
const PREDEFINED_FIELD_IDS = new Set([
  "landlord_name",
  "landlord_id",
  "landlord_address",
  "landlord_email",
  "landlord_phone",
  "tenant_name",
  "tenant_id",
  "tenant_address",
  "tenant_email",
  "tenant_phone",
  "property_address",
  "monthly_rental",
  "deposit_amount",
  "commencement_date",
  "termination_date",
  "lease_date",
  "current_date",
  "payment_bank",
  "payment_account_holder",
  "payment_account_number",
  "payment_branch_code"
])

export function TemplateFieldsForm({ fields, values, onChange }: TemplateFieldsFormProps) {
  // Filter out predefined fields - only show custom template fields
  const customFields = fields.filter((field) => !PREDEFINED_FIELD_IDS.has(field.id))

  if (customFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {customFields.map((field) => {
        const fieldValue = values[field.id] || field.defaultValue || ""

        const renderInput = () => {
          switch (field.type) {
            case "textarea":
              return (
                <Textarea
                  value={fieldValue}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  required={field.required}
                />
              )
            case "number":
            case "currency":
              return (
                <Input
                  type="number"
                  step={field.type === "currency" ? "0.01" : undefined}
                  value={fieldValue}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )
            case "date":
              return (
                <Input
                  type="date"
                  value={fieldValue}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  required={field.required}
                />
              )
            case "email":
              return (
                <Input
                  type="email"
                  value={fieldValue}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )
            case "tel":
              return (
                <Input
                  type="tel"
                  value={fieldValue}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )
            case "text":
            default:
              return (
                <Input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )
          }
        }

        return (
          <div key={field.id}>
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {renderInput()}
            {field.suffix && (
              <span className="text-sm text-muted-foreground ml-2">{field.suffix}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

