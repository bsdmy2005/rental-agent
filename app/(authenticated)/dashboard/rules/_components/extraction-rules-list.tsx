"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRulesByUserProfileIdQuery } from "@/queries/extraction-rules-queries"

export async function ExtractionRulesList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const rules = await getExtractionRulesByUserProfileIdQuery(userProfile.id)

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No extraction rules found.</p>
        <p className="text-muted-foreground text-sm">
          Create extraction rules to automatically process bills and invoices.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {rules.map((rule) => (
          <div key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{rule.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {rule.billType} • {rule.channel}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  rule.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}
              >
                {rule.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

