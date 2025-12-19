"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getBillingSchedulesForPropertyAction } from "@/actions/billing-schedules-actions"
import { getScheduleStatusForPropertyAction } from "@/actions/billing-schedule-status-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BillingSchedulesList } from "./_components/schedules-list"
import { ScheduleStatusDashboard } from "./_components/schedule-status-dashboard"
import { WorkflowDAG } from "./_components/workflow-dag"

export default async function BillingSetupPage({
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

  // Get current schedules and statuses
  const schedulesResult = await getBillingSchedulesForPropertyAction(propertyId)
  const schedules = schedulesResult.isSuccess ? schedulesResult.data : []

  const statusesResult = await getScheduleStatusForPropertyAction(propertyId)
  const statuses = statusesResult.isSuccess ? statusesResult.data : []

  // Get current period
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/properties/${propertyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Billing Setup</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure expected billing schedules for {property.name}
          </p>
        </div>
      </div>

      <ScheduleStatusDashboard
        propertyId={propertyId}
        schedules={schedules}
        statuses={statuses}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />

      <WorkflowDAG propertyId={propertyId} schedules={schedules} />

      <BillingSchedulesList
        propertyId={propertyId}
        schedules={schedules}
        statuses={statuses}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />
    </div>
  )
}

