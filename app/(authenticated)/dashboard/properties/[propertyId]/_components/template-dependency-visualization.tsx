"use server"

import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"
import { type SelectBillTemplate } from "@/db/schema"
import { DependencyGraph } from "./dependency-graph"

interface TemplateDependencyVisualizationProps {
  propertyId: string
  billTemplates: SelectBillTemplate[]
}

export async function TemplateDependencyVisualization({
  propertyId,
  billTemplates
}: TemplateDependencyVisualizationProps) {
  // Fetch invoice templates with tenant info
  const invoiceTemplatesResult = await getRentalInvoiceTemplatesByPropertyIdAction(propertyId)
  const invoiceTemplates = invoiceTemplatesResult.isSuccess ? invoiceTemplatesResult.data || [] : []

  // Fetch payable templates
  const payableTemplatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
  const payableTemplates = payableTemplatesResult.isSuccess ? payableTemplatesResult.data || [] : []

  // Fetch tenants for the property
  const tenants = await getTenantsByPropertyIdQuery(propertyId)

  // Map invoice templates with tenant info
  const invoiceTemplatesWithTenants = invoiceTemplates.map((template) => {
    const tenant = tenants.find((t) => t.id === template.tenantId)
    return {
      ...template,
      tenant: tenant || null
    }
  })

  // Get all active bill templates
  const activeBillTemplates = billTemplates.filter((bt) => bt.isActive)

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700" />
          <span className="text-sm font-medium">Bill Templates</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700" />
          <span className="text-sm font-medium">Invoice Templates</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 bg-purple-100 border-purple-300 dark:bg-purple-900 dark:border-purple-700" />
          <span className="text-sm font-medium">Payable Templates</span>
        </div>
      </div>

      {/* Visualization */}
      <DependencyGraph
        propertyId={propertyId}
        billTemplates={activeBillTemplates}
        invoiceTemplates={invoiceTemplatesWithTenants}
        payableTemplates={payableTemplates}
      />

      {/* Description */}
      <div className="pt-4 border-t space-y-2">
        <h4 className="font-semibold text-sm">How Dependencies Work</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            • <strong>Bill Templates</strong> define the types of bills expected (e.g., Municipality, Levy, Utility)
          </p>
          <p>
            • <strong>Invoice Templates</strong> specify which bill templates must arrive before generating tenant invoices
          </p>
          <p>
            • <strong>Payable Templates</strong> specify which bill templates must arrive before generating landlord payables
          </p>
          <p className="pt-2">
            When bills are processed and matched to periods, the system checks if all required bill templates have arrived. 
            Once all dependencies are met, invoice and payable instances can be generated automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

