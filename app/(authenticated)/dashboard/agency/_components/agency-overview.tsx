"use server"

import { getAgencyMembersQuery } from "@/queries/rental-agencies-queries"
import { getPendingMembershipRequestsQuery } from "@/queries/agency-memberships-queries"
import { getAgencyPropertiesQuery } from "@/queries/rental-agencies-queries"
import { PendingRequests } from "./pending-requests"
import { AgencyMembers } from "./agency-members"
import { AgencyPropertiesList } from "./agency-properties-list"
import { ManageAgentPropertiesDialog } from "./manage-agent-properties-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Clock } from "lucide-react"

interface AgencyOverviewProps {
  agencyId: string
}

export async function AgencyOverview({ agencyId }: AgencyOverviewProps) {
  const members = await getAgencyMembersQuery(agencyId, "approved")
  const pendingRequests = await getPendingMembershipRequestsQuery(agencyId)
  const properties = await getAgencyPropertiesQuery(agencyId)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agency Statistics</CardTitle>
          <CardDescription>Overview of your agency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{members.length}</div>
                <div className="text-muted-foreground text-sm">Active Members</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{properties.length}</div>
                <div className="text-muted-foreground text-sm">Properties</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingRequests.length}</div>
                <div className="text-muted-foreground text-sm">Pending Requests</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Pending Membership Requests</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Review and approve agent membership requests
            </p>
          </div>
        </div>
        <PendingRequests agencyId={agencyId} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Agency Properties</h2>
            <p className="text-muted-foreground text-sm mt-1">
              All properties managed by your agency
            </p>
          </div>
        </div>
        <AgencyPropertiesList agencyId={agencyId} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Agency Members</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Manage properties for your agents
            </p>
          </div>
          <ManageAgentPropertiesDialog agencyId={agencyId} />
        </div>
        <AgencyMembers agencyId={agencyId} />
      </div>
    </div>
  )
}

