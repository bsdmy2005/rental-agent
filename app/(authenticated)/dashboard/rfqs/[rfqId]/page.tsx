import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { db } from "@/db"
import { quoteRequestsTable, propertiesTable, incidentsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Copy, CheckCircle } from "lucide-react"
import { RfqComparisonTable } from "@/components/rfq-comparison-table"
import { getRfqComparisonAction } from "@/actions/service-providers-actions"
import { format } from "date-fns"
import { RfqCodeManagement } from "./_components/rfq-code-management"

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

  // Get quotes for comparison
  const quotesResult = await getRfqComparisonAction(rfqId)
  const quotes = quotesResult.isSuccess && quotesResult.data ? quotesResult.data : []

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
          </p>
        </div>
        {getStatusBadge(rfq.status)}
      </div>

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

      {quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Received Quotes</CardTitle>
            <CardDescription>
              {quotes.length} quote{quotes.length !== 1 ? "s" : ""} received for this RFQ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {quote.providerBusinessName || quote.providerName}
                        </h3>
                        {getStatusBadge(quote.status)}
                        <Badge variant="outline">
                          {quote.submissionMethod === "web_form" ? "Web Portal" : "Email"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">{quote.amount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Completion Date</p>
                          <p>
                            {quote.estimatedCompletionDate
                              ? format(new Date(quote.estimatedCompletionDate), "MMM dd, yyyy")
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submission Code</p>
                          <p className="font-mono text-xs">{quote.submissionCode || "-"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submitted</p>
                          <p>{format(new Date(quote.submittedAt), "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                      {quote.description && (
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="text-sm">{quote.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quotes Comparison</CardTitle>
          <CardDescription>
            {quotes.length === 0
              ? "No quotes received yet"
              : `Comparing ${quotes.length} quote${quotes.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RfqComparisonTable quotes={quotes} />
        </CardContent>
      </Card>
    </div>
  )
}

