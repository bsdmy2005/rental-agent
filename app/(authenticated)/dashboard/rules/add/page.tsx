"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesByRentalAgentIdQuery } from "@/queries/properties-queries"
import { RuleBuilderWrapper } from "./_components/rule-builder-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function AddExtractionRulePage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  let properties: Array<{ id: string; name: string }> = []
  if (userProfile?.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile?.userType === "rental_agent") {
    const rentalAgent = await getRentalAgentByUserProfileIdQuery(userProfile.id)
    if (rentalAgent) {
      const agentProperties = await getPropertiesByRentalAgentIdQuery(rentalAgent.id)
      properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/rules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Extraction Rule</h1>
          <p className="text-muted-foreground mt-2">
            Configure how the system extracts data from bills to generate invoices and payment instructions
          </p>
        </div>
      </div>

      {userProfile && properties.length > 0 ? (
        <>
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
              <div className="mt-4 rounded-md bg-muted p-3">
                <p className="text-muted-foreground text-xs">
                  <strong>Tip:</strong> You can create a single rule that extracts both invoice and payment data
                  from the same bill. The system will automatically suggest field mappings based on your bill type.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create New Extraction Rule</CardTitle>
              <CardDescription>
                Follow the step-by-step process below. The system will guide you through each step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RuleBuilderWrapper userProfileId={userProfile.id} properties={properties} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">
              {properties.length === 0
                ? "Please create a property first before creating extraction rules."
                : "Please sign in to create extraction rules."}
            </p>
            {properties.length === 0 && (
              <Button asChild className="mt-4">
                <Link href="/dashboard/properties/add">Create Property</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

