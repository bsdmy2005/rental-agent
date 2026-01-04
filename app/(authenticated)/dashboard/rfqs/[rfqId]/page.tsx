import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { db } from "@/db"
import { quoteRequestsTable, propertiesTable, incidentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Copy, CheckCircle, Users, FileText } from "lucide-react"
import { RfqComparisonTable } from "@/components/rfq-comparison-table"
import { getRfqComparisonAction } from "@/actions/service-providers-actions"
import { getRfqsInGroupQuery } from "@/queries/rfqs-queries"
import { format } from "date-fns"
import { RfqCodeManagement } from "./_components/rfq-code-management"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

async function getRfqDetails(rfqId: string) {
  const [rfq] = await db
    .select()
    .from(quoteRequestsTable)
    .where(eq(quoteRequestsTable.id, rfqId))
    .limit(1)

  if (!rfq) {
    return null
  }

  let property = null
  if (rfq.propertyId) {
    const [propertyData] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.id, rfq.propertyId))
      .limit(1)
    property = propertyData || null
  }

  let incident = null
  if (rfq.incidentId) {
    const [incidentData] = await db
      .select()
      .from(incidentsTable)
      .where(eq(incidentsTable.id, rfq.incidentId))
      .limit(1)
    incident = incidentData
  }

  return { rfq, property, incident }
}

export default async function RfqDetailPage({
  params
}: {
  params: Promise<{ rfqId: string }>
}) {
  const { rfqId } = await params
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Only landlords and rental agents can access this
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    return <div>Unauthorized</div>
  }

  const details = await getRfqDetails(rfqId)
  if (!details) {
    return <div>RFQ not found</div>
  }

  const { rfq, property, incident } = details
  
  if (!property) {
    return <div>Property not found for this RFQ</div>
  }

  // Get quotes for comparison (aggregated from all RFQs in the group)
  const quotesResult = await getRfqComparisonAction(rfqId)
  const comparisonData = quotesResult.isSuccess && quotesResult.data ? quotesResult.data : {
    quotes: [],
    cheapestQuoteId: null,
    totalQuotes: 0,
    totalProviders: 0
  }

  // Get all RFQs in the same group
  const rfqsInGroup = await getRfqsInGroupQuery(rfqId)

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      requested: "default",
      quoted: "secondary",
      approved: "outline",
      rejected: "destructive",
      expired: "destructive"
    }

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/rfqs">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to RFQs
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {rfq.title || (incident ? incident.title : "RFQ Details")}
          </h1>
          <p className="text-muted-foreground">
            {rfq.rfqCode && (
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded mr-2">
                {rfq.rfqCode}
              </span>
            )}
            Created {format(new Date(rfq.requestedAt), "MMM dd, yyyy")}
            {rfqsInGroup.length > 1 && (
              <span className="ml-2">
                • {rfqsInGroup.length} provider{rfqsInGroup.length !== 1 ? "s" : ""} in this group
              </span>
            )}
          </p>
        </div>
        {getStatusBadge(rfq.status)}
      </div>

      {/* Quote Comparison Table - Prominently displayed at the top */}
      {comparisonData.quotes.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Quote Comparison</CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {comparisonData.totalProviders} provider{comparisonData.totalProviders !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {comparisonData.totalQuotes} quote{comparisonData.totalQuotes !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RfqComparisonTable
              quotes={comparisonData.quotes}
              cheapestQuoteId={comparisonData.cheapestQuoteId}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>RFQ Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property</p>
              <p className="text-lg">{property.name}</p>
              <p className="text-sm text-muted-foreground">
                {property.streetAddress}, {property.suburb}, {property.province}
              </p>
            </div>

            {incident && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Linked Incident</p>
                <Link href={`/dashboard/properties/${property.id}/incidents/${incident.id}`}>
                  <Button variant="link" className="p-0 h-auto">
                    {incident.title}
                  </Button>
                </Link>
              </div>
            )}

            {rfq.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{rfq.description}</p>
              </div>
            )}

            {rfq.dueDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                <p className="text-sm">{format(new Date(rfq.dueDate), "MMM dd, yyyy")}</p>
              </div>
            )}

            {rfq.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm">{rfq.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-sm">
                Sent to {rfq.sentCount} provider{rfq.sentCount !== 1 ? "s" : ""} | Received{" "}
                {rfq.receivedCount} quote{rfq.receivedCount !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RFQ Code</CardTitle>
            <CardDescription>Share this code with service providers</CardDescription>
          </CardHeader>
          <CardContent>
            <RfqCodeManagement rfqId={rfqId} rfqCode={rfq.rfqCode} />
          </CardContent>
        </Card>
      </div>

      {/* RFQ Group Information - Collapsible */}
      {rfqsInGroup.length > 1 && (
        <Card>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>RFQ Group</CardTitle>
                    <CardDescription>
                      {rfqsInGroup.length} RFQ{rfqsInGroup.length !== 1 ? "s" : ""} in this group
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {rfqsInGroup.map((rfqWithRelations) => (
                    <Link
                      key={rfqWithRelations.rfq.id}
                      href={`/dashboard/rfqs/${rfqWithRelations.rfq.id}`}
                    >
                      <div
                        className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors ${
                          rfqWithRelations.rfq.id === rfqId ? "bg-muted border-primary" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm">
                                {rfqWithRelations.rfq.rfqCode || "-"}
                              </span>
                              {rfqWithRelations.rfq.id === rfqId && (
                                <Badge variant="outline">Current</Badge>
                              )}
                              {getStatusBadge(rfqWithRelations.rfq.status)}
                            </div>
                            {rfqWithRelations.serviceProvider && (
                              <p className="text-sm text-muted-foreground">
                                {rfqWithRelations.serviceProvider.businessName ||
                                  rfqWithRelations.serviceProvider.contactName}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(rfqWithRelations.rfq.requestedAt), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  )
}

