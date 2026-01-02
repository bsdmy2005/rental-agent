"use server"

import { getAgencyPropertiesWithAgentsQuery } from "@/queries/agency-properties-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Building2, MapPin, Users } from "lucide-react"

interface AgencyPropertiesListProps {
  agencyId: string
}

export async function AgencyPropertiesList({ agencyId }: AgencyPropertiesListProps) {
  const properties = await getAgencyPropertiesWithAgentsQuery(agencyId)

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agency Properties</CardTitle>
          <CardDescription>No properties assigned to this agency yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency Properties ({properties.length})</CardTitle>
        <CardDescription>All properties managed by your agency</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {properties.map((item) => (
            <Link
              key={item.managementId}
              href={`/dashboard/properties/${item.property.id}`}
              className="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent block"
            >
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{item.property.name}</div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {item.property.streetAddress}, {item.property.suburb}, {item.property.province}
                      </span>
                    </div>
                  </div>
                </div>
                {item.individuallyAssignedAgents.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Individually assigned to:</span>
                    {item.individuallyAssignedAgents.map((agent) => (
                      <Badge key={agent.agentId} variant="outline" className="text-xs">
                        {agent.agentName}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

