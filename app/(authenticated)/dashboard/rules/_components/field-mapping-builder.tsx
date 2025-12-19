"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface FieldMapping {
  id: string
  type: string
  label: string
  patterns: string[]
  extractUsage?: boolean
  extractBeneficiary?: boolean
  extractAccountNumber?: boolean
}

interface FieldMappingBuilderProps {
  type: "invoice" | "payment"
  billType: string
  mappings: FieldMapping[]
  onChange: (mappings: FieldMapping[]) => void
}

const INVOICE_FIELD_TYPES = [
  { value: "water", label: "Water", description: "Water usage and charges", icon: "💧" },
  { value: "electricity", label: "Electricity", description: "Electricity usage and charges", icon: "⚡" },
  { value: "sewerage", label: "Sewerage", description: "Sewerage charges", icon: "🚰" },
  { value: "other", label: "Other", description: "Other tenant-chargeable items", icon: "📄" }
]

const PAYMENT_FIELD_TYPES = [
  { value: "levy", label: "Body Corporate Levy", description: "Body corporate or levy charges", icon: "🏢" },
  { value: "body_corporate", label: "Body Corporate Fees", description: "Body corporate fees", icon: "🏘️" },
  { value: "municipality", label: "Municipality Charges", description: "Municipality fees and charges", icon: "🏛️" },
  { value: "other", label: "Other", description: "Other landlord-payable items", icon: "📄" }
]

const SUGGESTED_PATTERNS: Record<string, Record<string, string[]>> = {
  invoice: {
    water: ["water", "water charges", "water usage", "wtr", "h2o"],
    electricity: ["electricity", "power", "energy", "kwh", "elec"],
    sewerage: ["sewerage", "sewer", "sanitation", "sewage"]
  },
  payment: {
    levy: ["levy", "body corporate", "bc levy", "levy charge"],
    body_corporate: ["body corporate", "bc fees", "sectional title"],
    municipality: ["municipality", "city council", "municipal", "rates"]
  }
}

export function FieldMappingBuilder({
  type,
  billType,
  mappings,
  onChange
}: FieldMappingBuilderProps) {
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldType, setNewFieldType] = useState("")
  const [newPatterns, setNewPatterns] = useState<Record<string, string>>({})

  const fieldTypes = type === "invoice" ? INVOICE_FIELD_TYPES : PAYMENT_FIELD_TYPES
  const suggestedPatterns = SUGGESTED_PATTERNS[type] || {}

  const addField = () => {
    if (!newFieldType) return

    const fieldType = fieldTypes.find((ft) => ft.value === newFieldType)
    if (!fieldType) return

    const suggested = suggestedPatterns[newFieldType] || []
    const newMapping: FieldMapping = {
      id: Date.now().toString(),
      type: newFieldType,
      label: fieldType.label,
      patterns: suggested.length > 0 ? [...suggested] : [newFieldType.toLowerCase()],
      extractUsage: type === "invoice" && (newFieldType === "water" || newFieldType === "electricity"),
      extractBeneficiary: type === "payment",
      extractAccountNumber: type === "payment"
    }

    onChange([...mappings, newMapping])
    setNewFieldType("")
    setShowAddField(false)
  }

  const removeField = (id: string) => {
    onChange(mappings.filter((m) => m.id !== id))
  }

  const updateField = (id: string, updates: Partial<FieldMapping>) => {
    onChange(
      mappings.map((m) => (m.id === id ? { ...m, ...updates } : m))
    )
  }

  const addPattern = (id: string, pattern: string) => {
    if (!pattern.trim()) return
    const field = mappings.find((m) => m.id === id)
    if (field && !field.patterns.includes(pattern.trim().toLowerCase())) {
      updateField(id, { patterns: [...field.patterns, pattern.trim().toLowerCase()] })
      // Clear the input for this field
      setNewPatterns((prev) => ({ ...prev, [id]: "" }))
    }
  }

  const removePattern = (id: string, patternIndex: number) => {
    const field = mappings.find((m) => m.id === id)
    if (field) {
      updateField(id, {
        patterns: field.patterns.filter((_, i) => i !== patternIndex)
      })
    }
  }

  const borderColor = type === "invoice" 
    ? "border-green-500 dark:border-green-600" 
    : "border-purple-500 dark:border-purple-600"
  const bgColor = type === "invoice"
    ? "bg-green-50/50 dark:bg-green-950/20"
    : "bg-purple-50/50 dark:bg-purple-950/20"
  const headerColor = type === "invoice"
    ? "text-green-900 dark:text-green-100"
    : "text-purple-900 dark:text-purple-100"

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-bold text-base ${headerColor}`}>
              {type === "invoice" ? "Invoice Field Mappings" : "Payment Field Mappings"}
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              {type === "invoice"
                ? "Tell the system what to look for when extracting tenant-chargeable items (water, electricity, etc.)"
                : "Tell the system what to look for when extracting landlord-payable items (levies, fees, etc.)"}
            </p>
          </div>
          {!showAddField && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddField(true)}
              className={type === "invoice" ? "border-green-600 text-green-700 hover:bg-green-100 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950" : "border-purple-600 text-purple-700 hover:bg-purple-100 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-950"}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          )}
        </div>
      </div>

      {showAddField && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add New Field Mapping</CardTitle>
            <CardDescription className="text-xs">
              Select the type of field you want to extract from bills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {fieldTypes
                .filter((ft) => !mappings.some((m) => m.type === ft.value))
                .map((fieldType) => (
                  <button
                    key={fieldType.value}
                    type="button"
                    onClick={() => {
                      setNewFieldType(fieldType.value)
                      addField()
                    }}
                    className="flex items-start gap-2 rounded-md border p-3 text-left hover:bg-muted transition-colors"
                  >
                    <span className="text-lg">{fieldType.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{fieldType.label}</p>
                      <p className="text-muted-foreground text-xs">{fieldType.description}</p>
                    </div>
                  </button>
                ))}
            </div>
            {fieldTypes.filter((ft) => !mappings.some((m) => m.type === ft.value)).length === 0 && (
              <p className="text-muted-foreground text-xs text-center py-2">
                All field types have been added
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddField(false)
                setNewFieldType("")
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {mappings.map((mapping) => {
          const fieldType = fieldTypes.find((ft) => ft.value === mapping.type)
          const newPattern = newPatterns[mapping.id] || ""

          return (
            <Card key={mapping.id} className={`border-2 ${borderColor} ${bgColor}`}>
              <CardHeader className={`pb-3 ${bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{fieldType?.icon || "📄"}</span>
                    <div>
                      <CardTitle className="text-sm">{fieldType?.label || mapping.label}</CardTitle>
                      <CardDescription className="text-xs">{fieldType?.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(mapping.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-medium mb-2 block">
                    Display Name
                  </Label>
                  <Input
                    value={mapping.label}
                    onChange={(e) => updateField(mapping.id, { label: e.target.value })}
                    placeholder="e.g., Water Charges"
                    className="h-9"
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    This name will appear in invoices/payments
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-2 block">
                    Search Keywords
                  </Label>
                  <p className="text-muted-foreground mb-2 text-xs">
                    Add words or phrases that appear in bills for this item (e.g., "water", "water charges")
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {mapping.patterns.map((pattern, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {pattern}
                        <button
                          type="button"
                          onClick={() => removePattern(mapping.id, idx)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newPattern}
                      onChange={(e) =>
                        setNewPatterns((prev) => ({ ...prev, [mapping.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          if (newPattern.trim()) {
                            addPattern(mapping.id, newPattern)
                          }
                        }
                      }}
                      placeholder="Type keyword and press Enter"
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newPattern.trim()) {
                          addPattern(mapping.id, newPattern)
                        }
                      }}
                      disabled={!newPattern.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {type === "invoice" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`extractUsage-${mapping.id}`}
                      checked={mapping.extractUsage || false}
                      onCheckedChange={(checked) =>
                        updateField(mapping.id, { extractUsage: checked === true })
                      }
                    />
                    <Label
                      htmlFor={`extractUsage-${mapping.id}`}
                      className="text-xs font-normal cursor-pointer"
                    >
                      Extract usage/consumption amounts (for water/electricity)
                    </Label>
                  </div>
                )}

                {type === "payment" && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`extractBeneficiary-${mapping.id}`}
                        checked={mapping.extractBeneficiary || false}
                        onCheckedChange={(checked) =>
                          updateField(mapping.id, { extractBeneficiary: checked === true })
                        }
                      />
                      <Label
                        htmlFor={`extractBeneficiary-${mapping.id}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        Extract beneficiary name (who to pay)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`extractAccount-${mapping.id}`}
                        checked={mapping.extractAccountNumber || false}
                        onCheckedChange={(checked) =>
                          updateField(mapping.id, { extractAccountNumber: checked === true })
                        }
                      />
                      <Label
                        htmlFor={`extractAccount-${mapping.id}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        Extract account number for payment
                      </Label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {mappings.length === 0 && (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No field mappings added yet. Click "Add Field" to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

