"use server"

import { getAllUserProfilesQuery } from "@/queries/user-profiles-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getAgentPropertiesWithAssignmentsQuery } from "@/queries/agent-properties-queries"
import { ExpandableUserRow } from "./expandable-user-row"

export async function UsersList() {
  const users = await getAllUserProfilesQuery()

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No users found.</p>
      </div>
    )
  }

  // For rental agents, get their agent ID and property count
  const usersWithMetadata = await Promise.all(
    users.map(async (user) => {
      if (user.userType === "rental_agent") {
        const rentalAgent = await getRentalAgentByUserProfileIdQuery(user.id)
        if (rentalAgent) {
          const properties = await getAgentPropertiesWithAssignmentsQuery(rentalAgent.id)
          return {
            user,
            rentalAgentId: rentalAgent.id,
            propertyCount: properties.length
          }
        }
      }
      return {
        user,
        rentalAgentId: null,
        propertyCount: undefined
      }
    })
  )

  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {usersWithMetadata.map(({ user, rentalAgentId, propertyCount }) => (
          <ExpandableUserRow
            key={user.id}
            userProfile={user}
            rentalAgentId={rentalAgentId}
            propertyCount={propertyCount}
          />
        ))}
      </div>
    </div>
  )
}

