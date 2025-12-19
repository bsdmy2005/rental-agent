"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getRentalAgentByUserProfileIdQuery } from "@/queries/rental-agents-queries"
import {
  getPropertiesByLandlordIdQuery,
  getPropertiesByRentalAgentIdQuery
} from "@/queries/properties-queries"
import { BillUploadWrapper } from "../_components/bill-upload-wrapper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function UploadBillPage() {
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
        <Link href="/dashboard/bills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Upload Bills</h1>
          <p className="text-muted-foreground mt-2">
            Upload municipality and other statements for your properties. The system will process
            them into invoices and payment instructions.
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
                  <CardTitle className="text-lg">How Bill Uploads Work</CardTitle>
                  <CardDescription className="mt-1">
                    Attach each bill to the correct property. Extraction rules will be applied
                    automatically where configured.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You can drag-and-drop or browse for PDF statements. For the most consistent
                results, keep using the same bill format per property (e.g. municipality account,
                body corporate levy).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Property & Upload</CardTitle>
              <CardDescription>
                Choose a property first, then upload one or more PDF bills for that property.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillUploadWrapper properties={properties} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">
              {properties.length === 0
                ? "Please create a property first before uploading bills."
                : "Please sign in to upload bills."}
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


