"use server"

import { redirect, notFound } from "next/navigation"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getTenantByUserProfileIdQuery } from "@/queries/tenants-queries"
import { getIncidentByIdWithDetailsQuery } from "@/queries/incidents-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function TenantIncidentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile || userProfile.userType !== "tenant") {
    redirect("/dashboard")
  }

  const tenant = await getTenantByUserProfileIdQuery(userProfile.id)
  if (!tenant) {
    return <div>Tenant record not found</div>
  }

  const { id } = await params
  const incident = await getIncidentByIdWithDetailsQuery(id)

  if (!incident) {
    notFound()
  }

  // Verify tenant owns this incident
  if (incident.tenantId !== tenant.id) {
    return <div>Unauthorized</div>
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
      <div className="flex items-center gap-4">
        <Link href="/tenant/incidents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{incident.title}</h1>
          <p className="text-muted-foreground">{incident.property.name}</p>
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
              <p className="text-sm text-muted-foreground">Reported</p>
              <p>{format(new Date(incident.reportedAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
            </div>
            {incident.resolvedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p>{format(new Date(incident.resolvedAt), "MMMM dd, yyyy 'at' h:mm a")}</p>
              </div>
            )}
            {incident.assignedToUser && (
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p>
                  {incident.assignedToUser.firstName} {incident.assignedToUser.lastName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status History</CardTitle>
            <CardDescription>Track the progress of your incident</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incident.statusHistory.map((history, index) => (
                <div key={history.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {index < incident.statusHistory.length - 1 && (
                      <div className="h-8 w-0.5 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusColors[history.status] || "default"}>
                        {history.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(history.changedAt), "MMM dd, yyyy h:mm a")}
                      </span>
                    </div>
                    {history.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                    )}
                    {history.changedByUser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {history.changedByUser.firstName} {history.changedByUser.lastName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {incident.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>Photos attached to this incident</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {incident.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative aspect-video rounded-lg overflow-hidden border"
                >
                  {attachment.fileType === "image" ? (
                    <Image
                      src={attachment.fileUrl}
                      alt={attachment.fileName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <p className="text-sm text-muted-foreground">{attachment.fileName}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

