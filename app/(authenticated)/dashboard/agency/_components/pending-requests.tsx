"use server"

import { getPendingMembershipRequestsQuery } from "@/queries/agency-memberships-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PendingRequestActions } from "./pending-request-actions"

interface PendingRequestsProps {
  agencyId: string
}

export async function PendingRequests({ agencyId }: PendingRequestsProps) {
  const requests = await getPendingMembershipRequestsQuery(agencyId)

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Membership Requests</CardTitle>
          <CardDescription>No pending requests</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Membership Requests</CardTitle>
        <CardDescription>Approve or reject agent membership requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="font-semibold">
                  {request.rentalAgent.userProfile.firstName}{" "}
                  {request.rentalAgent.userProfile.lastName}
                </div>
                <div className="text-muted-foreground text-sm">
                  {request.rentalAgent.userProfile.email}
                </div>
                <div className="text-muted-foreground text-xs">
                  Requested: {new Date(request.requestedAt).toLocaleDateString()}
                </div>
              </div>
              <PendingRequestActions membershipId={request.id} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

