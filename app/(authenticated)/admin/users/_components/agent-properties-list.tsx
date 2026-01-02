"use server"

import { getAgentPropertiesWithAssignmentsQuery } from "@/queries/agent-properties-queries"
import { Badge } from "@/components/ui/badge"
import { Link } from "next/link"
import { Building2, MapPin } from "lucide-react"

interface AgentPropertiesListProps {
  rentalAgentId: string
}

export async function AgentPropertiesList({ rentalAgentId }: AgentPropertiesListProps) {
  const properties = await getAgentPropertiesWithAssignmentsQuery(rentalAgentId)

  if (properties.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No properties assigned to this agent yet.
      </div>
    )
  }

  // Group by assignment type
  const individualProperties = properties.filter((p) => p.assignmentType === "individual")
  const agencyProperties = properties.filter((p) => p.assignmentType === "agency")

  return (
    <div className="space-y-4 py-4">
      {individualProperties.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Individually Assigned</h4>
          <div className="space-y-2">
            {individualProperties.map((item) => (
              <PropertyRow key={item.managementId} property={item.property} />
            ))}
          </div>
        </div>
      )}

      {agencyProperties.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Assigned via Agency</h4>
          <div className="space-y-2">
            {agencyProperties.map((item) => (
              <PropertyRow
                key={item.managementId}
                property={item.property}
                agencyName={item.agencyName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PropertyRow({
  property,
  agencyName
}: {
  property: { id: string; name: string; streetAddress: string; suburb: string; province: string }
  agencyName?: string
}) {
  return (
    <Link
      href={`/dashboard/properties/${property.id}`}
      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
    >
      <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{property.name}</span>
          {agencyName && (
            <Badge variant="secondary" className="text-xs">
              {agencyName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>
            {property.streetAddress}, {property.suburb}, {property.province}
          </span>
        </div>
      </div>
    </Link>
  )
}

