"use server"

import { currentUser } from "@clerk/nextjs/server"
import Link from "next/link"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRulesByUserProfileIdQuery } from "@/queries/extraction-rules-queries"
import { getPropertyByIdQuery } from "@/queries/properties-queries"
import { Badge } from "@/components/ui/badge"

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

  // Fetch property names for each rule
  const rulesWithProperties = await Promise.all(
    rules.map(async (rule) => {
      const property = rule.propertyId ? await getPropertyByIdQuery(rule.propertyId) : null
      return {
        ...rule,
        propertyName: property?.name || "Unknown Property",
        propertyId: rule.propertyId
      }
    })
  )

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
        {rulesWithProperties.map((rule) => (
          <div key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{rule.name}</h3>
                  <Badge
                    variant={rule.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {rule.extractForInvoice && (
                    <Badge variant="outline" className="text-xs">
                      Invoice
                    </Badge>
                  )}
                  {rule.extractForPayment && (
                    <Badge variant="outline" className="text-xs">
                      Payment
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  {rule.propertyId ? (
                    <Link
                      href={`/dashboard/properties/${rule.propertyId}`}
                      className="text-primary hover:underline"
                    >
                      {rule.propertyName}
                    </Link>
                  ) : (
                    rule.propertyName
                  )}{" "}
                  • {rule.billType} •{" "}
                  {rule.channel === "email_forward"
                    ? "Email Forward"
                    : rule.channel === "agentic"
                      ? "Agentic"
                      : "Manual Upload"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/dashboard/rules/${rule.id}`}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Test Rule
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

