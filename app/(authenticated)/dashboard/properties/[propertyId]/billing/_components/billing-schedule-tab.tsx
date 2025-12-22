"use server"

import { getPeriodsForPropertyAction } from "@/actions/billing-periods-actions"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getPayableInstancesByPropertyIdAction } from "@/actions/payable-instances-actions"
import { getRentalInvoiceInstancesByPropertyIdAction } from "@/actions/rental-invoice-instances-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableSchedulesByPropertyIdAction } from "@/actions/payable-schedules-actions"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"
import { BillingScheduleView } from "../../billing-schedule/_components/billing-schedule-view"

interface BillingScheduleTabProps {
  propertyId: string
}

export async function BillingScheduleTab({ propertyId }: BillingScheduleTabProps) {
  // Fetch all periods for this property
  const invoicePeriodsResult = await getPeriodsForPropertyAction(propertyId, "invoice")
  const payablePeriodsResult = await getPeriodsForPropertyAction(propertyId, "payable")

  const invoicePeriods = invoicePeriodsResult.isSuccess ? invoicePeriodsResult.data : []
  const payablePeriods = payablePeriodsResult.isSuccess ? payablePeriodsResult.data : []

  // Fetch instances and templates for linking
  const payableInstancesResult = await getPayableInstancesByPropertyIdAction(propertyId)
  const payableInstances = payableInstancesResult.isSuccess ? payableInstancesResult.data : []

  const invoiceInstancesResult = await getRentalInvoiceInstancesByPropertyIdAction(propertyId)
  const invoiceInstances = invoiceInstancesResult.isSuccess ? invoiceInstancesResult.data : []

  const payableTemplatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
  const payableTemplates = payableTemplatesResult.isSuccess ? payableTemplatesResult.data : []

  const invoiceTemplatesResult = await getRentalInvoiceTemplatesByPropertyIdAction(propertyId)
  const invoiceTemplates = invoiceTemplatesResult.isSuccess ? invoiceTemplatesResult.data : []

  const payableSchedulesResult = await getPayableSchedulesByPropertyIdAction(propertyId)
  const payableSchedules = payableSchedulesResult.isSuccess ? payableSchedulesResult.data : []

  const tenants = await getTenantsByPropertyIdQuery(propertyId)

  // Get property name for display
  const property = await getPropertyByIdQuery(propertyId)

  return (
    <div>
      <BillingScheduleView
        propertyId={propertyId}
        propertyName={property?.name || "Property"}
        invoicePeriods={invoicePeriods}
        payablePeriods={payablePeriods}
        payableInstances={payableInstances}
        invoiceInstances={invoiceInstances}
        payableTemplates={payableTemplates}
        invoiceTemplates={invoiceTemplates}
        payableSchedules={payableSchedules}
        tenants={tenants}
        hideHeader={true}
      />
    </div>
  )
}

