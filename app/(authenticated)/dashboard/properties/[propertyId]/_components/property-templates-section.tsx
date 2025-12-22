"use server"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoiceTemplatesManager } from "./invoice-templates-manager"
import { PayableTemplatesManager } from "./payable-templates-manager"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"
import { type SelectBillTemplate } from "@/db/schema"

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

  // Map invoice templates with tenant info
  const invoiceTemplatesWithTenants = invoiceTemplates.map((template) => {
    const tenant = tenants.find((t) => t.id === template.tenantId)
    return {
      ...template,
      tenant: tenant || null
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <CardDescription>
          Manage invoice and payable templates and their bill template dependencies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoices">
              Invoice Templates ({invoiceTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="payables">
              Payable Templates ({payableTemplates.length})
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
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

