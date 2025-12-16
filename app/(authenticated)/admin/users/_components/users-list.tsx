"use server"

import { getAllUserProfilesQuery } from "@/queries/user-profiles-queries"
import { UserActions } from "./user-actions"

export async function UsersList() {
  const users = await getAllUserProfilesQuery()

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No users found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-muted-foreground text-sm">{user.email}</div>
              <div className="text-muted-foreground text-xs">
                Type: {user.userType} • {user.isActive ? "Active" : "Inactive"}
              </div>
            </div>
            <UserActions userProfile={user} />
          </div>
        ))}
      </div>
    </div>
  )
}

