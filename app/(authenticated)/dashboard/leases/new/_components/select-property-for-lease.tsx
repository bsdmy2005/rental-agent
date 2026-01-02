"use server"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery } from "@/queries/properties-queries"
import type { SelectUserProfile } from "@/db/schema"
import { SelectPropertyForLeaseClient } from "./select-property-for-lease-client"

interface SelectPropertyForLeaseProps {
  userProfile: SelectUserProfile
}

export async function SelectPropertyForLease({ userProfile }: SelectPropertyForLeaseProps) {
  let properties: Array<{ id: string; name: string; streetAddress: string; suburb: string; province: string }> = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const props = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = props.map((p) => ({
        id: p.id,
        name: p.name,
        streetAddress: p.streetAddress,
        suburb: p.suburb,
        province: p.province
      }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const props = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    properties = props.map((p) => ({
      id: p.id,
      name: p.name,
      streetAddress: p.streetAddress,
      suburb: p.suburb,
      province: p.province
    }))
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Properties Available</CardTitle>
          <CardDescription>
            You need to create at least one property before you can generate lease documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/properties/new">
            <Button>Add a Property</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return <SelectPropertyForLeaseClient properties={properties} />
}

