"use server"

import { getAgencyPropertiesQuery } from "@/queries/rental-agencies-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface AgencyPropertiesListProps {
  agencyId: string
}

export async function AgencyPropertiesList({ agencyId }: AgencyPropertiesListProps) {
  const properties = await getAgencyPropertiesQuery(agencyId)

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
          <CardDescription>No properties assigned to this agency yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties ({properties.length})</CardTitle>
        <CardDescription>Properties managed by this agency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {properties.map((management) => (
            <div
              key={management.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="font-semibold">{management.property.name}</div>
                <div className="text-muted-foreground text-sm">
                  {management.property.streetAddress}, {management.property.suburb}
                </div>
                <div className="text-muted-foreground text-xs">
                  Assigned: {new Date(management.startDate).toLocaleDateString()}
                </div>
              </div>
              <Link href={`/dashboard/properties/${management.property.id}`}>
                <Button variant="outline" size="sm">
                  View Property
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

