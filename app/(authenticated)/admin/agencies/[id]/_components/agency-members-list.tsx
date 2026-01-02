"use server"

import { getAgencyMembersQuery } from "@/queries/rental-agencies-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AgencyMembersListProps {
  agencyId: string
}

export async function AgencyMembersList({ agencyId }: AgencyMembersListProps) {
  const members = await getAgencyMembersQuery(agencyId, "approved")

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>No members yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>All approved members of this agency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="font-semibold">
                  {member.rentalAgent.userProfile.firstName}{" "}
                  {member.rentalAgent.userProfile.lastName}
                </div>
                <div className="text-muted-foreground text-sm">
                  {member.rentalAgent.userProfile.email}
                </div>
                <div className="text-muted-foreground text-xs">
                  Joined: {member.approvedAt ? new Date(member.approvedAt).toLocaleDateString() : "N/A"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

