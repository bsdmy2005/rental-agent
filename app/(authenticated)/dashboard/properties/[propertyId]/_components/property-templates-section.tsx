"use server"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoiceTemplatesManager } from "./invoice-templates-manager"
import { PayableTemplatesManager } from "./payable-templates-manager"
import { BillTemplatesManager } from "./bill-templates-manager"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getPaymentInstructionByPropertyAction } from "@/actions/payment-instructions-actions"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"
import { getExtractionRulesByPropertyIdQuery } from "@/queries/extraction-rules-queries"
import { type SelectBillTemplate, type SelectExtractionRule } from "@/db/schema"

interface PropertyTemplatesSectionProps {
  propertyId: string
  billTemplates: SelectBillTemplate[]
}

export async function PropertyTemplatesSection({
  propertyId,
  billTemplates
}: PropertyTemplatesSectionProps) {
  // Fetch invoice templates with tenant info
  const invoiceTemplatesResult = await getRentalInvoiceTemplatesByPropertyIdAction(propertyId)
  const invoiceTemplates = invoiceTemplatesResult.isSuccess ? invoiceTemplatesResult.data || [] : []

  // Fetch payable templates
  const payableTemplatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
  const payableTemplates = payableTemplatesResult.isSuccess ? payableTemplatesResult.data || [] : []

  // Fetch tenants for the property
  const tenants = await getTenantsByPropertyIdQuery(propertyId)

  // Fetch extraction rules for the property
  const extractionRules = await getExtractionRulesByPropertyIdQuery(propertyId)

  // Fetch payment instruction for bank account selection
  const paymentInstructionResult = await getPaymentInstructionByPropertyAction(propertyId)
  const paymentInstructionId = paymentInstructionResult.isSuccess && paymentInstructionResult.data
    ? paymentInstructionResult.data.id
    : null

  // Map invoice templates with tenant info
  const invoiceTemplatesWithTenants = invoiceTemplates.map((template) => {
    const tenant = tenants.find((t) => t.id === template.tenantId)
    return {
      ...template,
      tenant: tenant || null
    }
  })

  return (
    <div>
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices">
              Invoice Templates ({invoiceTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="payables">
              Payable Templates ({payableTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="bills">
              Bill Templates ({billTemplates.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invoices" className="mt-6">
            <InvoiceTemplatesManager
              propertyId={propertyId}
              invoiceTemplates={invoiceTemplatesWithTenants}
              tenants={tenants}
              billTemplates={billTemplates}
            />
          </TabsContent>
          <TabsContent value="payables" className="mt-6">
            <PayableTemplatesManager
              propertyId={propertyId}
              payableTemplates={payableTemplates}
              billTemplates={billTemplates}
              paymentInstructionId={paymentInstructionId}
            />
          </TabsContent>
          <TabsContent value="bills" className="mt-6">
            <BillTemplatesManager
              propertyId={propertyId}
              billTemplates={billTemplates}
              invoiceTemplates={invoiceTemplates}
              payableTemplates={payableTemplates}
              tenants={tenants}
              extractionRules={extractionRules}
            />
          </TabsContent>
        </Tabs>
    </div>
  )
}

