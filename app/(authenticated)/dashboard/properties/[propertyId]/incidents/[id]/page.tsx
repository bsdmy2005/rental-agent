"use server"

import { notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { getIncidentByIdWithDetailsQuery } from "@/queries/incidents-queries"
import { getQuotesByIncidentAction, getQuoteRequestsByIncidentAction, completeQuoteAction } from "@/actions/service-providers-actions"
import { updateIncidentStatusAction } from "@/actions/incidents-actions"
import Link from "next/link"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Image from "next/image"
import { IncidentManagementControls } from "./_components/incident-management-controls"
import { IncidentQuotesSection } from "./_components/incident-quotes-section"
import { CloseIncidentButton } from "./_components/close-incident-button"
import { IncidentMessageSummary } from "./_components/incident-message-summary"
import { IncidentTimeline } from "./_components/incident-timeline"
import { RequestQuoteDialog } from "./_components/request-quote-dialog"
import { getIncidentTimelineQuery } from "@/queries/incidents-queries"
import { whatsappSessionsTable } from "@/db/schema"
import { db } from "@/db"
import { eq, and } from "drizzle-orm"

export default async function IncidentManagementPage({
  params
}: {
  params: Promise<{ propertyId: string; id: string }>
}) {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { propertyId, id } = await params
  const property = await getPropertyByIdQuery(propertyId)

  if (!property) {
    notFound()
  }

  const incident = await getIncidentByIdWithDetailsQuery(id)
  if (!incident) {
    notFound()
  }

  const quotesResult = await getQuotesByIncidentAction(id)
  const quoteRequestsResult = await getQuoteRequestsByIncidentAction(id)
  const quoteRequests = quoteRequestsResult.isSuccess && quoteRequestsResult.data ? quoteRequestsResult.data : []

  // Fetch timeline for incidents
  let timelineItems: Array<{
    id: string
    timestamp: Date
    type: "message" | "status_change" | "photo_upload" | "assignment" | "quote_request" | "quote_approval" | "system_message" | "incident_created"
    actor?: { type: "user" | "system" | "tenant"; name: string; id?: string }
    content: string
    metadata?: Record<string, unknown>
  }> = []
  if (incident.submissionMethod === "whatsapp" && incident.submittedPhone) {
    try {
      // Find primary session for this user
      const primarySession = await db.query.whatsappSessions.findFirst({
        where: (sessions, { and, eq }) =>
          and(
            eq(sessions.userProfileId, userProfile.id),
            eq(sessions.sessionName, "primary")
          )
      })

      if (primarySession) {
        timelineItems = await getIncidentTimelineQuery(
          id,
          primarySession.id,
          incident.submittedPhone
        )
      } else {
        // Still get timeline without messages if no session
        timelineItems = await getIncidentTimelineQuery(id)
      }
    } catch (error) {
      console.error("Error fetching incident timeline:", error)
      // Fallback to timeline without messages
      timelineItems = await getIncidentTimelineQuery(id).catch(() => [])
    }
  } else {
    // For non-WhatsApp incidents, still show timeline (status changes, quotes, etc.)
    timelineItems = await getIncidentTimelineQuery(id).catch(() => [])
  }

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    reported: "secondary",
    assigned: "default",
    in_progress: "default",
    awaiting_quote: "outline",
    awaiting_approval: "outline",
    resolved: "default",
    closed: "secondary"
  }

  const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    low: "secondary",
    medium: "default",
    high: "destructive",
    urgent: "destructive"
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/properties/${propertyId}/incidents`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{incident.title}</h1>
            <p className="text-muted-foreground">{property.name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incident Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={statusColors[incident.status] || "default"}>
                {incident.status.replace("_", " ")}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge variant={priorityColors[incident.priority] || "default"}>
                {incident.priority}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap">{incident.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reported By</p>
              <p>
                {incident.tenant.id
                  ? incident.tenant.name
                  : incident.submittedName || "Anonymous"}
                {incident.submittedPhone && ` (${incident.submittedPhone})`}
              </p>
              {!incident.tenant.id && (
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted via {incident.submissionMethod}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p>
                {incident.property.streetAddress}, {incident.property.suburb},{" "}
                {incident.property.province}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reported</p>
              <p>{format(new Date(incident.reportedAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
            </div>
            {incident.resolvedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p>{format(new Date(incident.resolvedAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management</CardTitle>
          </CardHeader>
          <CardContent>
            <IncidentManagementControls
              incident={incident}
              propertyId={propertyId}
              currentUserId={userProfile.id}
              propertySuburb={incident.property.suburb}
              propertyProvince={incident.property.province}
            />
          </CardContent>
        </Card>
      </div>

      {quoteRequests.length > 0 && (
        <IncidentQuotesSection quoteRequests={quoteRequests} />
      )}

      {incident.status !== "closed" && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RequestQuoteDialog
              incidentId={id}
              propertyId={propertyId}
              propertySuburb={incident.property.suburb}
              propertyProvince={incident.property.province}
              requestedBy={userProfile.id}
              incidentTitle={incident.title}
              incidentDescription={incident.description}
            />
            <CloseIncidentButton
              incidentId={id}
              currentStatus={incident.status}
              hasApprovedQuotes={quotesResult.isSuccess && quotesResult.data
                ? quotesResult.data.some((q) => q.status === "approved")
                : false}
              userProfileId={userProfile.id}
            />
          </CardContent>
        </Card>
      )}

      {incident.submissionMethod === "whatsapp" && (
        <IncidentMessageSummary
          description={incident.description}
          submittedPhone={incident.submittedPhone}
          submittedName={incident.submittedName}
        />
      )}

      {timelineItems.length > 0 && <IncidentTimeline items={timelineItems} />}
    </div>
  )
}

