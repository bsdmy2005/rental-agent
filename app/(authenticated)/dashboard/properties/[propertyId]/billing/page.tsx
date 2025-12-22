"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getBillTemplatesByPropertyIdAction } from "@/actions/bill-templates-actions"
import { getPayableTemplatesByPropertyIdAction } from "@/actions/payable-templates-actions"
import { getRentalInvoiceTemplatesByPropertyIdAction } from "@/actions/rental-invoice-templates-actions"
import { getBillArrivalSchedulesByPropertyIdAction } from "@/actions/bill-arrival-schedules-actions"
import { getPayableSchedulesByPropertyIdAction } from "@/actions/payable-schedules-actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BillingOverview } from "./_components/billing-overview"
import { BillingScheduleTab } from "./_components/billing-schedule-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function BillingPage({
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

  // Fetch all templates
  const billTemplatesResult = await getBillTemplatesByPropertyIdAction(propertyId)
  const billTemplates = billTemplatesResult.isSuccess ? billTemplatesResult.data : []

  const payableTemplatesResult = await getPayableTemplatesByPropertyIdAction(propertyId)
  const payableTemplates = payableTemplatesResult.isSuccess ? payableTemplatesResult.data : []

  const invoiceTemplatesResult = await getRentalInvoiceTemplatesByPropertyIdAction(propertyId)
  const invoiceTemplates = invoiceTemplatesResult.isSuccess ? invoiceTemplatesResult.data : []

  // Fetch schedules for templates
  const billArrivalSchedulesResult = await getBillArrivalSchedulesByPropertyIdAction(propertyId)
  const billArrivalSchedules = billArrivalSchedulesResult.isSuccess ? billArrivalSchedulesResult.data : []

  const payableSchedulesResult = await getPayableSchedulesByPropertyIdAction(propertyId)
  const payableSchedules = payableSchedulesResult.isSuccess ? payableSchedulesResult.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${propertyId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Billing Schedule</h1>
            <p className="text-muted-foreground mt-1 text-sm">{property.name}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Billing Schedule</TabsTrigger>
          <TabsTrigger value="bill-templates">Bill Templates</TabsTrigger>
          <TabsTrigger value="payable-templates">Payable Templates</TabsTrigger>
          <TabsTrigger value="invoice-templates">Invoice Templates</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <BillingOverview
            propertyId={propertyId}
            billTemplates={billTemplates}
            payableTemplates={payableTemplates}
            invoiceTemplates={invoiceTemplates}
            billArrivalSchedules={billArrivalSchedules}
            payableSchedules={payableSchedules}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <BillingScheduleTab propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="bill-templates" className="mt-6">
          <div className="text-muted-foreground">Bill Templates UI - Coming soon</div>
        </TabsContent>

        <TabsContent value="payable-templates" className="mt-6">
          <div className="text-muted-foreground">Payable Templates UI - Coming soon</div>
        </TabsContent>

        <TabsContent value="invoice-templates" className="mt-6">
          <div className="text-muted-foreground">Invoice Templates UI - Coming soon</div>
        </TabsContent>

        <TabsContent value="instances" className="mt-6">
          <div className="text-muted-foreground">Instances UI - Coming soon</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

