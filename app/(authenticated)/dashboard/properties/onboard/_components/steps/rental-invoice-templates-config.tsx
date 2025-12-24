"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useWizardState } from "../wizard-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RentalInvoiceTemplatesConfigProps {
  tenantIndex: number
}

export function RentalInvoiceTemplatesConfig({ tenantIndex }: RentalInvoiceTemplatesConfigProps) {
  const { state, updateTenants } = useWizardState()
  const tenant = state.tenants[tenantIndex]
  const displayData = tenant.extractedData || tenant.manualData
  const tenantName = displayData?.name || `Tenant ${tenantIndex + 1}`

  // Get all saved bill templates (all can be dependencies, not just those with invoice extraction)
  const availableBillTemplates = state.billTemplates.filter((bt) => bt.billTemplateId)

  // Get current template config or initialize with defaults
  const templateConfig = tenant.rentalInvoiceTemplate || {
    name: `${tenantName} Rental Invoice`,
    description: "",
    dependsOnBillTemplateIds: [],
    generationDayOfMonth: 5,
    pdfTemplate: "classic" as const
  }

  const toggleBillTemplateDependency = (billTemplateId: string) => {
    const currentDeps = templateConfig.dependsOnBillTemplateIds || []
    const newDeps = currentDeps.includes(billTemplateId)
      ? currentDeps.filter((id) => id !== billTemplateId)
      : [...currentDeps, billTemplateId]

    const updated = [...state.tenants]
    updated[tenantIndex] = {
      ...updated[tenantIndex],
      rentalInvoiceTemplate: {
        ...templateConfig,
        dependsOnBillTemplateIds: newDeps
      }
    }
    updateTenants(updated)
  }

  const updateTemplateField = (field: "name" | "description" | "generationDayOfMonth" | "pdfTemplate", value: string | number) => {
    const updated = [...state.tenants]
    updated[tenantIndex] = {
      ...updated[tenantIndex],
      rentalInvoiceTemplate: {
        ...templateConfig,
        [field]: value
      }
    }
    updateTenants(updated)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Rental Invoice Template</Label>
        <p className="text-muted-foreground text-xs mt-1">
          Configure the invoice template for this tenant. Specify which bill templates must arrive before generating invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Template Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`template-name-${tenantIndex}`}>Template Name</Label>
            <Input
              id={`template-name-${tenantIndex}`}
              value={templateConfig.name || ""}
              onChange={(e) => updateTemplateField("name", e.target.value)}
              placeholder={`${tenantName} Rental Invoice`}
              className="h-10"
              disabled={!!tenant.tenantId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`template-description-${tenantIndex}`}>Description (Optional)</Label>
            <Textarea
              id={`template-description-${tenantIndex}`}
              value={templateConfig.description || ""}
              onChange={(e) => updateTemplateField("description", e.target.value)}
              placeholder="Optional description"
              rows={2}
              disabled={!!tenant.tenantId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`generation-day-${tenantIndex}`}>Generation Day of Month</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`generation-day-${tenantIndex}`}
                type="number"
                min="1"
                max="31"
                value={templateConfig.generationDayOfMonth || 5}
                onChange={(e) =>
                  updateTemplateField("generationDayOfMonth", parseInt(e.target.value, 10) || 5)
                }
                className="h-10 w-24"
                disabled={!!tenant.tenantId}
              />
              <span className="text-muted-foreground text-sm">of each month</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pdf-template-${tenantIndex}`}>PDF Template Style</Label>
            <Select
              value={(templateConfig.pdfTemplate as string) || "classic"}
              onValueChange={(value) => updateTemplateField("pdfTemplate", value)}
              disabled={!!tenant.tenantId}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select PDF template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic - Traditional professional layout</SelectItem>
                <SelectItem value="modern">Modern - Colorful and contemporary design</SelectItem>
                <SelectItem value="minimal">Minimal - Clean and simple layout</SelectItem>
                <SelectItem value="professional">Professional - Corporate formal style</SelectItem>
                <SelectItem value="elegant">Elegant - Sophisticated refined design</SelectItem>
                <SelectItem value="compact">Compact - Space-efficient dense layout</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the visual style for generated PDF invoices
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Bill Template Dependencies</Label>
        <p className="text-muted-foreground text-xs">
          Select which bill templates must arrive before generating invoices for this tenant
        </p>

        {availableBillTemplates.length === 0 ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
            <p className="text-yellow-900 text-sm dark:text-yellow-200">
              No bill templates available. Please add bill templates in Step 2.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableBillTemplates.map((billTemplate) => {
              const billTemplateId = billTemplate.billTemplateId!
              const isSelected = templateConfig.dependsOnBillTemplateIds.includes(billTemplateId)
              const hasInvoiceExtraction = billTemplate.newRule?.extractForInvoice || billTemplate.ruleId

              return (
                <Card key={billTemplateId} className={isSelected ? "border-primary" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`dep-${tenantIndex}-${billTemplateId}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleBillTemplateDependency(billTemplateId)}
                        className="mt-1"
                        disabled={!!tenant.tenantId}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`dep-${tenantIndex}-${billTemplateId}`}
                          className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                        >
                          {billTemplate.name || "Bill Template"}
                          <Badge variant="outline">{billTemplate.billType}</Badge>
                          {hasInvoiceExtraction && (
                            <Badge variant="secondary" className="text-xs">
                              Invoice extraction
                            </Badge>
                          )}
                        </Label>
                        <p className="text-muted-foreground text-xs mt-1">
                          Bills from this template will contribute to the tenant invoice
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {templateConfig.dependsOnBillTemplateIds.length > 0 && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-blue-900 text-sm font-medium dark:text-blue-200 mb-2">
            Invoice Template Configuration:
          </p>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Name:</span> {templateConfig.name || `${tenantName} Rental Invoice`}
            </div>
            <div>
              <span className="font-medium">Generation Day:</span> Day {templateConfig.generationDayOfMonth} of each month
            </div>
            <div>
              <span className="font-medium">Dependencies:</span> {templateConfig.dependsOnBillTemplateIds.length} bill template(s)
            </div>
            {templateConfig.rentalInvoiceTemplateId && (
              <Badge variant="outline" className="mt-2">
                Saved
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
