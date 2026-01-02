"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getExtractionRuleByIdQuery } from "@/queries/extraction-rules-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"
import { EditRuleBuilderWrapper } from "../_components/edit-rule-builder-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function EditExtractionRulePage({
  params
}: {
  params: Promise<{ ruleId: string }>
}) {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  if (!userProfile) {
    return <div>User profile not found</div>
  }

  const { ruleId } = await params
  const rule = await getExtractionRuleByIdQuery(ruleId)

  if (!rule) {
    notFound()
  }

  // Verify user owns this rule
  if (rule.userProfileId !== userProfile.id) {
    return <div>Unauthorized</div>
  }

  let properties: Array<{ id: string; name: string }> = []
  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const agentProperties = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/rules/${ruleId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Extraction Rule</h1>
          <p className="text-muted-foreground mt-2">
            Update your extraction rule configuration
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">How Extraction Rules Work</CardTitle>
              <CardDescription className="mt-1">
                Extraction rules tell the system how to read and extract data from your bills
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-2">For Invoice Generation</h4>
              <p className="text-muted-foreground text-sm">
                Extract tenant-chargeable items like water usage, electricity usage, and sewerage charges.
                This data is used to generate invoices that tenants pay.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">For Payment Processing</h4>
              <p className="text-muted-foreground text-sm">
                Extract landlord-payable items like body corporate levies and municipality fees.
                This data is used to create payment instructions for you to pay on behalf of the property.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Extraction Rule</CardTitle>
          <CardDescription>
            Update the rule configuration below. The system will guide you through each step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading rule...</div>}>
            <EditRuleBuilderWrapper rule={rule} userProfileId={userProfile.id} properties={properties} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

