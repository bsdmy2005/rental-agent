"use client"

import { useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type SelectRentalInvoiceTemplate, type SelectPayableTemplate, type SelectTenant } from "@/db/schema"

interface ReverseDependencyEditorProps {
  billTemplateId: string
  invoiceTemplates: SelectRentalInvoiceTemplate[]
  payableTemplates: SelectPayableTemplate[]
  tenants: SelectTenant[]
  currentInvoiceDependents: string[] // invoice template IDs that currently depend on this bill template
  currentPayableDependents: string[] // payable template IDs that currently depend on this bill template
  onDependenciesChange: (invoiceIds: string[], payableIds: string[]) => void
}

export function ReverseDependencyEditor({
  billTemplateId,
  invoiceTemplates,
  payableTemplates,
  tenants,
  currentInvoiceDependents,
  currentPayableDependents,
  onDependenciesChange
}: ReverseDependencyEditorProps) {
  const toggleInvoiceDependency = (invoiceTemplateId: string) => {
    const newInvoiceDependents = currentInvoiceDependents.includes(invoiceTemplateId)
      ? currentInvoiceDependents.filter((id) => id !== invoiceTemplateId)
      : [...currentInvoiceDependents, invoiceTemplateId]
    onDependenciesChange(newInvoiceDependents, currentPayableDependents)
  }

  const togglePayableDependency = (payableTemplateId: string) => {
    const newPayableDependents = currentPayableDependents.includes(payableTemplateId)
      ? currentPayableDependents.filter((id) => id !== payableTemplateId)
      : [...currentPayableDependents, payableTemplateId]
    onDependenciesChange(currentInvoiceDependents, newPayableDependents)
  }

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return null
    const tenant = tenants.find((t) => t.id === tenantId)
    return tenant?.name || null
  }

  return (
    <div className="space-y-4">
      {/* Invoice Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Templates</CardTitle>
          <CardDescription>
            Select which invoice templates should depend on this bill template
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoice templates available</p>
          ) : (
            <div className="space-y-3">
              {invoiceTemplates.map((template) => {
                const isSelected = currentInvoiceDependents.includes(template.id)
                const tenantName = getTenantName(template.tenantId)
                return (
                  <div key={template.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`invoice-${template.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleInvoiceDependency(template.id)}
                    />
                    <Label
                      htmlFor={`invoice-${template.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {tenantName && (
                          <Badge variant="outline" className="text-xs">
                            {tenantName}
                          </Badge>
                        )}
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </Label>
                  </div>
                )
              })}
            </div>
          )}
          {currentInvoiceDependents.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">
                Selected Invoice Templates ({currentInvoiceDependents.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {currentInvoiceDependents.map((templateId) => {
                  const template = invoiceTemplates.find((t) => t.id === templateId)
                  if (!template) return null
                  const tenantName = getTenantName(template.tenantId)
                  return (
                    <Badge key={templateId} variant="secondary" className="text-xs">
                      {template.name}
                      {tenantName && ` (${tenantName})`}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payable Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payable Templates</CardTitle>
          <CardDescription>
            Select which payable templates should depend on this bill template
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payableTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payable templates available</p>
          ) : (
            <div className="space-y-3">
              {payableTemplates.map((template) => {
                const isSelected = currentPayableDependents.includes(template.id)
                return (
                  <div key={template.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`payable-${template.id}`}
                      checked={isSelected}
                      onCheckedChange={() => togglePayableDependency(template.id)}
                    />
                    <Label
                      htmlFor={`payable-${template.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {template.description && (
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        )}
                      </div>
                    </Label>
                  </div>
                )
              })}
            </div>
          )}
          {currentPayableDependents.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">
                Selected Payable Templates ({currentPayableDependents.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPayableDependents.map((templateId) => {
                  const template = payableTemplates.find((t) => t.id === templateId)
                  if (!template) return null
                  return (
                    <Badge key={templateId} variant="secondary" className="text-xs">
                      {template.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

