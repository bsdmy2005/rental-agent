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
import { getIncidentsByPropertyIdAction } from "@/actions/incidents-actions"
import { getExpensesByPropertyIdWithCategoryQuery } from "@/queries/expenses-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Plus, AlertCircle, DollarSign, AlertTriangle, Building2, FileText, Calendar, CreditCard, Settings, Key, FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PropertyBillsSection } from "./_components/property-bills-section"
import { PropertyRulesSection } from "./_components/property-rules-section"
import { LeaseDrivenPeriodsSummary } from "./_components/lease-driven-periods-summary"
import { PropertyTemplatesSection } from "./_components/property-templates-section"
import { TemplateDependencyVisualization } from "./_components/template-dependency-visualization"
import { CollapsibleSectionCard } from "./_components/collapsible-section-card"
import { PropertyBankingDetailsSection } from "./_components/property-banking-details-section"
import { PropertyLandlordDetailsSection } from "./_components/property-landlord-details-section"
import { PropertyCodeManagementSection } from "./_components/property-code-management-section"
import { PropertyLeasesSection } from "./_components/property-leases-section"
import { IncidentsManagementList } from "./incidents/_components/incidents-management-list"
import { ExpensesList } from "./expenses/_components/expenses-list"

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

  // Get incidents for this property
  const incidentsResult = await getIncidentsByPropertyIdAction(propertyId)
  const incidents = incidentsResult.isSuccess ? incidentsResult.data || [] : []

  // Get expenses for this property
  const expenses = await getExpensesByPropertyIdWithCategoryQuery(propertyId)

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
          <Link href={`/dashboard/properties/${propertyId}/leases/new`}>
            <Button variant="default">
              <Plus className="mr-2 h-4 w-4" />
              Initiate New Lease
            </Button>
          </Link>
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

      {/* Property Navigation Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">
            <DollarSign className="h-4 w-4 mr-2" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Incidents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Landlord Details Section */}
          <CollapsibleSectionCard
            title="Landlord Contact Details"
            description="Landlord contact information for contracts and communication. Required for lease agreements."
            defaultOpen={false}
            icon="User"
            iconColor="text-green-600"
          >
            <PropertyLandlordDetailsSection property={property} />
          </CollapsibleSectionCard>

          {/* Banking Details Section */}
          <CollapsibleSectionCard
            title="Payment Instructions"
            description="Banking details that will appear on rental invoices for this property"
            defaultOpen={false}
            icon="CreditCard"
            iconColor="text-blue-600"
          >
            <PropertyBankingDetailsSection property={property} />
          </CollapsibleSectionCard>

      {/* Templates Management Section */}
      {hasTemplates && (
        <CollapsibleSectionCard
          title="Templates"
          description="Manage bill templates, invoice templates, and payable templates and their dependencies"
          defaultOpen={false}
          icon="FileText"
          iconColor="text-purple-600"
        >
          <PropertyTemplatesSection propertyId={propertyId} billTemplates={billTemplates} />
        </CollapsibleSectionCard>
      )}

      {/* Leases Section */}
      <CollapsibleSectionCard
        title="Lease Agreements"
        description="View and manage lease agreements for this property. Track signing status and pending leases."
        defaultOpen={false}
        icon="FileCheck"
        iconColor="text-blue-600"
        actionButton={
          <Link href={`/dashboard/properties/${propertyId}/leases/new`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Lease
            </Button>
          </Link>
        }
      >
        <PropertyLeasesSection propertyId={propertyId} />
      </CollapsibleSectionCard>

      {/* Lease-Driven Billing Periods Summary */}
      <CollapsibleSectionCard
        title="Lease-Driven Billing Periods"
        description="Invoice periods are automatically generated when lease agreements are uploaded. Payable periods can be generated manually."
        defaultOpen={false}
        icon="Calendar"
        iconColor="text-green-600"
        actionButton={
          <Link href={`/dashboard/properties/${propertyId}/billing-schedule`}>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              View Schedule
            </Button>
          </Link>
        }
      >
        <LeaseDrivenPeriodsSummary propertyId={propertyId} />
      </CollapsibleSectionCard>

      {/* Billing Schedule Status */}
      {schedules.length > 0 && (
        <CollapsibleSectionCard
          title="Billing Schedule Status"
          description="Current status of expected billing schedules for this property"
          defaultOpen={false}
          icon="Settings"
          iconColor="text-orange-600"
          actionButton={
            <Link href={`/dashboard/properties/${propertyId}/billing-schedule`}>
              <Button variant="outline" size="sm">
                Manage Schedules
              </Button>
            </Link>
          }
        >
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
        </CollapsibleSectionCard>
      )}

      {/* Template Dependency Visualization */}
      {hasTemplates && (
        <CollapsibleSectionCard
          title="Template Dependencies"
          description="Visual representation of how bill templates, invoice templates, and payable templates are connected"
          defaultOpen={false}
          icon="Settings"
          iconColor="text-indigo-600"
        >
          <TemplateDependencyVisualization propertyId={propertyId} billTemplates={billTemplates} />
        </CollapsibleSectionCard>
      )}

      {/* Collapsible Bills Section */}
      <CollapsibleSectionCard
        title="Property Bills"
        description="Bills received for this property (grouped by type)"
        defaultOpen={false}
        icon="FileText"
        iconColor="text-cyan-600"
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
        description="Rules configured for this property (grouped by bill type). Rules linked to bill templates are indicated."
        defaultOpen={false}
        icon="Settings"
        iconColor="text-pink-600"
        actionButton={
          <Link href={`/dashboard/rules?propertyId=${propertyId}`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </Link>
        }
      >
        <PropertyRulesSection 
          rules={rules} 
          rulesByBillType={rulesByBillType}
          billTemplates={billTemplates}
        />
      </CollapsibleSectionCard>

      {/* Collapsible Property Code Section */}
      <CollapsibleSectionCard
        title="Incident Submission Code"
        description="Generate a unique code for tenants to submit incidents without logging in"
        defaultOpen={false}
        icon="Key"
        iconColor="text-amber-600"
      >
        <PropertyCodeManagementSection propertyId={propertyId} propertyName={property.name} />
      </CollapsibleSectionCard>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Property Expenses</h2>
              <p className="text-muted-foreground">Track expenses for tax purposes</p>
            </div>
            <Link href={`/dashboard/properties/${propertyId}/expenses/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>
                All expenses recorded for this property
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <ExpensesList expenses={expenses} propertyId={propertyId} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No expenses recorded yet. Add your first expense to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Property Incidents</h2>
              <p className="text-muted-foreground">Manage tenant-reported incidents and maintenance requests</p>
            </div>
            <Link href={`/dashboard/properties/${propertyId}/incidents`}>
              <Button variant="outline">
                View All Incidents
              </Button>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Incidents</CardTitle>
              <CardDescription>
                All incidents reported for this property (including anonymous submissions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidentsResult.isSuccess && incidents ? (
                <IncidentsManagementList incidents={incidents} propertyId={propertyId} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {incidentsResult.message || "No incidents reported for this property yet."}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

