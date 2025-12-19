"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { getExtractionRulesByPropertyIdQuery } from "@/queries/extraction-rules-queries"
import { getBillingSchedulesForPropertyAction } from "@/actions/billing-schedules-actions"
import { getScheduleStatusForPropertyAction } from "@/actions/billing-schedule-status-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Plus, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyBillsSection } from "./_components/property-bills-section"
import { PropertyRulesSection } from "./_components/property-rules-section"

export default async function PropertyDetailPage({
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

  const bills = await getBillsByPropertyIdQuery(propertyId)
  const rules = await getExtractionRulesByPropertyIdQuery(propertyId)

  // Get billing schedules and statuses
  const schedulesResult = await getBillingSchedulesForPropertyAction(propertyId)
  const schedules = schedulesResult.isSuccess ? schedulesResult.data : []

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const statusesResult = await getScheduleStatusForPropertyAction(propertyId, currentYear, currentMonth)
  const statuses = statusesResult.isSuccess ? statusesResult.data : []

  // Find late schedules
  const lateSchedules = schedules.filter((schedule) => {
    const status = statuses.find((s) => s.scheduleId === schedule.id)
    return status && (status.status === "late" || status.status === "missed")
  })

  // Group bills by type
  const billsByType = {
    municipality: bills.filter((b) => b.billType === "municipality"),
    levy: bills.filter((b) => b.billType === "levy"),
    utility: bills.filter((b) => b.billType === "utility"),
    other: bills.filter((b) => b.billType === "other")
  }

  // Group rules by bill type
  const rulesByBillType = {
    municipality: rules.filter((r) => r.billType === "municipality"),
    levy: rules.filter((r) => r.billType === "levy"),
    utility: rules.filter((r) => r.billType === "utility"),
    other: rules.filter((r) => r.billType === "other")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{property.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {property.address}, {property.suburb}, {property.province}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/properties/${propertyId}/billing-setup`}>
          <Button variant="outline">
            {schedules.length > 0 ? "Manage Billing Schedules" : "Setup Billing Schedules"}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Property Bills</CardTitle>
                  <CardDescription>
                    Bills received for this property (grouped by type)
                  </CardDescription>
                </div>
                <Link href="/dashboard/bills">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Bill
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <PropertyBillsSection bills={bills} billsByType={billsByType} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extraction Rules</CardTitle>
                  <CardDescription>
                    Rules configured for this property (grouped by bill type)
                  </CardDescription>
                </div>
                <Link href={`/dashboard/rules?propertyId=${propertyId}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Rule
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <PropertyRulesSection rules={rules} rulesByBillType={rulesByBillType} />
            </CardContent>
          </Card>
        </div>
      </div>

      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Billing Schedule Status</CardTitle>
                <CardDescription>
                  Current status of expected billing schedules for this property
                </CardDescription>
              </div>
              <Link href={`/dashboard/properties/${propertyId}/billing-setup`}>
                <Button variant="outline" size="sm">
                  Manage Schedules
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lateSchedules.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      {lateSchedules.length} schedule{lateSchedules.length > 1 ? "s" : ""} {lateSchedules.length > 1 ? "are" : "is"} late or missed
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Review billing setup to ensure all schedules are on track
                    </p>
                  </div>
                  <Link href={`/dashboard/properties/${propertyId}/billing-setup`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge className="bg-green-600">All schedules on track</Badge>
                <span>•</span>
                <span>{schedules.length} schedule{schedules.length !== 1 ? "s" : ""} configured</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Flow</CardTitle>
              <CardDescription>How bills are processed for this property</CardDescription>
            </div>
            {schedules.length === 0 && (
              <Link href={`/dashboard/properties/${propertyId}/billing-setup`}>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Setup Billing Schedules
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="rounded-full bg-primary/10 text-primary px-3 py-1 font-medium dark:bg-primary/20 dark:text-primary">
                Property
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="rounded-full bg-muted text-muted-foreground px-3 py-1 font-medium dark:bg-muted dark:text-muted-foreground">
                Multiple Bills ({bills.length})
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="rounded-full bg-muted text-muted-foreground px-3 py-1 font-medium dark:bg-muted dark:text-muted-foreground">
                Rules ({rules.length})
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="rounded-full bg-green-100 text-green-700 px-3 py-1 font-medium dark:bg-green-950 dark:text-green-300">
                Invoice Data
              </div>
              <span className="text-muted-foreground">+</span>
              <div className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 font-medium dark:bg-blue-950 dark:text-blue-300">
                Payment Data
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              Bills are processed using extraction rules. Each rule can extract invoice data
              (tenant-chargeable items), payment data (landlord-payable items), or both.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

