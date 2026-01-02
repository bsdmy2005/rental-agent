"use server"

import { getAgencyMembersQuery } from "@/queries/rental-agencies-queries"
import { getAgentPropertiesWithAssignmentsQuery } from "@/queries/agent-properties-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpandableMemberRow } from "./expandable-member-row"

interface AgencyMembersProps {
  agencyId: string
}

export async function AgencyMembers({ agencyId }: AgencyMembersProps) {
  const members = await getAgencyMembersQuery(agencyId, "approved")

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agency Members</CardTitle>
          <CardDescription>No members yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Get property counts for each member
  const membersWithPropertyCounts = await Promise.all(
    members.map(async (member) => {
      const properties = await getAgentPropertiesWithAssignmentsQuery(member.rentalAgent.id)
      return {
        member,
        propertyCount: properties.length
      }
    })
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency Members</CardTitle>
        <CardDescription>All approved members of your agency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border divide-y">
          {membersWithPropertyCounts.map(({ member, propertyCount }) => (
            <ExpandableMemberRow
              key={member.id}
              agentId={member.rentalAgent.id}
              agentName={`${member.rentalAgent.userProfile.firstName} ${member.rentalAgent.userProfile.lastName}`}
              agentEmail={member.rentalAgent.userProfile.email}
              joinDate={member.approvedAt}
              propertyCount={propertyCount}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

