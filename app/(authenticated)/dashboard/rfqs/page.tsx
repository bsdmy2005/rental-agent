import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { db } from "@/db"
import { propertiesTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { RfqsList } from "./_components/rfqs-list"
import { getRfqGroupsQuery } from "@/queries/rfqs-queries"

async function getRfqsForUser(userProfileId: string, userType: string) {
  try {
    // Get property IDs based on user type
    let propertyIds: string[] = []

    if (userType === "landlord") {
      const { getLandlordByUserProfileIdQuery } = await import("@/queries/landlords-queries")
      const landlord = await getLandlordByUserProfileIdQuery(userProfileId)
      if (landlord) {
        const properties = await db
          .select({ id: propertiesTable.id })
          .from(propertiesTable)
          .where(eq(propertiesTable.landlordId, landlord.id))
        propertyIds = properties.map((p) => p.id)
      }
    } else if (userType === "rental_agent") {
      const { getPropertiesForUserQuery } = await import("@/queries/properties-queries")
      const properties = await getPropertiesForUserQuery(userProfileId, userType)
      propertyIds = properties.map((p) => p.id)
    }

    if (propertyIds.length === 0) {
      return []
    }

    // Get grouped RFQs
    const result = await getRfqGroupsQuery(propertyIds)
    return result || []
  } catch (error) {
    console.error("Error fetching RFQs:", error)
    return []
  }
}

export default async function RfqsPage() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Only landlords and rental agents can access this
  if (userProfile.userType !== "landlord" && userProfile.userType !== "rental_agent") {
    return <div>Unauthorized</div>
  }

  const rfqs = await getRfqsForUser(userProfile.id, userProfile.userType)
  const rfqGroups = rfqs || []

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RFQs</h1>
          <p className="text-muted-foreground">Manage your quote requests</p>
        </div>
        <Link href="/dashboard/rfqs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New RFQ
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All RFQs</CardTitle>
          <CardDescription>
            {rfqGroups.length === 0
              ? "No RFQs found"
              : `Showing ${rfqGroups.length} RFQ group${rfqGroups.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RfqsList rfqGroups={rfqGroups} />
        </CardContent>
      </Card>
    </div>
  )
}

