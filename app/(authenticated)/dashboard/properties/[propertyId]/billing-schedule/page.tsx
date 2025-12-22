import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getPeriodsForPropertyAction } from "@/actions/billing-periods-actions"
import { getPayableInstancesByPropertyIdAction } from "@/actions/payable-instances-actions"
import { getRentalInvoiceInstancesByPropertyIdAction } from "@/actions/rental-invoice-instances-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getPayableSchedulesByPropertyIdAction } from "@/actions/payable-schedules-actions"
import { getTenantsByPropertyIdQuery } from "@/queries/tenants-queries"
import { getPeriodsDependencyStatusQuery } from "@/queries/period-dependency-status-queries"
import { getBillsByPeriodIdAction } from "@/actions/period-bill-matches-actions"
import { BillingScheduleView } from "./_components/billing-schedule-view"
import { notFound } from "next/navigation"

export default async function BillingSchedulePage({
  params
}: {
  params: Promise<{ propertyId: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

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

  // Fetch dependency statuses for all periods (real-time calculation)
  const allPeriodIds = [
    ...invoicePeriods.map((p) => p.id),
    ...payablePeriods.map((p) => p.id)
  ]
  const dependencyStatuses = await getPeriodsDependencyStatusQuery(allPeriodIds)

  // Fetch bills for all periods
  const billsByPeriod = new Map<string, Awaited<ReturnType<typeof getBillsByPeriodIdAction>>["data"]>()
  for (const periodId of allPeriodIds) {
    const billsResult = await getBillsByPeriodIdAction(periodId)
    if (billsResult.isSuccess && billsResult.data) {
      billsByPeriod.set(periodId, billsResult.data)
    }
  }

  return (
    <BillingScheduleView
      propertyId={propertyId}
      propertyName={property.name}
      invoicePeriods={invoicePeriods}
      payablePeriods={payablePeriods}
      payableInstances={payableInstances}
      invoiceInstances={invoiceInstances}
      payableTemplates={payableTemplates}
      invoiceTemplates={invoiceTemplates}
      payableSchedules={payableSchedules}
      tenants={tenants}
      dependencyStatuses={dependencyStatuses}
      billsByPeriod={billsByPeriod}
    />
  )
}

