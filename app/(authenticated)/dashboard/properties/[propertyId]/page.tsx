"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { getExtractionRulesByPropertyIdQuery } from "@/queries/extraction-rules-queries"
import { getBillingSchedulesForPropertyAction } from "@/actions/billing-schedules-actions"
import { getScheduleStatusForPropertyAction } from "@/actions/billing-schedule-status-actions"
import { getBillTemplatesByPropertyIdAction } from "@/actions/bill-templates-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Plus, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PropertyBillsSection } from "./_components/property-bills-section"
import { PropertyRulesSection } from "./_components/property-rules-section"
import { LeaseDrivenPeriodsSummary } from "./_components/lease-driven-periods-summary"
import { PropertyTemplatesSection } from "./_components/property-templates-section"
import { TemplateDependencyVisualization } from "./_components/template-dependency-visualization"
import { CollapsibleSectionCard } from "./_components/collapsible-section-card"
import { PropertyBankingDetailsSection } from "./_components/property-banking-details-section"

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

  // Check if templates have been set up
  const billTemplatesResult = await getBillTemplatesByPropertyIdAction(propertyId)
  const billTemplates = billTemplatesResult.isSuccess ? billTemplatesResult.data : []
  const hasTemplates = billTemplates.length > 0

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
        <div className="flex items-center gap-2">
          {!hasTemplates && (
            <Link href={`/dashboard/properties/${propertyId}/setup-templates`}>
              <Button variant="default">
                Setup Billing Templates
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/properties/${propertyId}/billing-schedule`}>
            <Button variant="outline">
              {schedules.length > 0 ? "Manage Billing Schedules" : "Setup Billing Schedules"}
            </Button>
          </Link>
          <Link href={`/dashboard/properties/${propertyId}/payment-instructions`}>
            <Button variant="outline">
              Payment Instructions
            </Button>
          </Link>
        </div>
      </div>

      {/* Banking Details Section */}
      <PropertyBankingDetailsSection property={property} />

      {/* Templates Management Section */}
      {hasTemplates && (
        <PropertyTemplatesSection propertyId={propertyId} billTemplates={billTemplates} />
      )}

      {/* Lease-Driven Billing Periods Summary */}
      <LeaseDrivenPeriodsSummary propertyId={propertyId} />

      {/* Billing Schedule Status */}
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
              <Link href={`/dashboard/properties/${propertyId}/billing-schedule`}>
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
                  <Link href={`/dashboard/properties/${propertyId}/billing-schedule`}>
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

      {/* Template Dependency Visualization */}
      {hasTemplates && (
        <CollapsibleSectionCard
          title="Template Dependencies"
          description="Visual representation of how bill templates, invoice templates, and payable templates are connected"
          defaultOpen={false}
        >
          <TemplateDependencyVisualization propertyId={propertyId} billTemplates={billTemplates} />
        </CollapsibleSectionCard>
      )}

      {/* Collapsible Bills Section */}
      <CollapsibleSectionCard
        title="Property Bills"
        description="Bills received for this property (grouped by type)"
        defaultOpen={false}
        actionButton={
          <Link href="/dashboard/bills">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Upload Bill
            </Button>
          </Link>
        }
      >
        <PropertyBillsSection bills={bills} billsByType={billsByType} />
      </CollapsibleSectionCard>

      {/* Collapsible Rules Section */}
      <CollapsibleSectionCard
        title="Extraction Rules"
        description="Rules configured for this property (grouped by bill type)"
        defaultOpen={false}
        actionButton={
          <Link href={`/dashboard/rules?propertyId=${propertyId}`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </Link>
        }
      >
        <PropertyRulesSection rules={rules} rulesByBillType={rulesByBillType} />
      </CollapsibleSectionCard>
    </div>
  )
}

