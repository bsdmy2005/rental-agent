"use server"

import { getRentalAgencyByIdQuery } from "@/queries/rental-agencies-queries"
import { getAgencyMembersQuery } from "@/queries/rental-agencies-queries"
import { getAgencyPropertiesQuery } from "@/queries/rental-agencies-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AgencyMembersList } from "./agency-members-list"
import { AgencyPropertiesList } from "./agency-properties-list"
import { AssignPropertyDialog } from "./assign-property-dialog"

interface AgencyDetailsProps {
  agencyId: string
}

export async function AgencyDetails({ agencyId }: AgencyDetailsProps) {
  const agency = await getRentalAgencyByIdQuery(agencyId)
  if (!agency) {
    return <div>Agency not found</div>
  }

  const members = await getAgencyMembersQuery(agencyId, "approved")
  const properties = await getAgencyPropertiesQuery(agencyId)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agency Information</CardTitle>
              <CardDescription>Details about this rental agency</CardDescription>
            </div>
            <Badge variant={agency.isActive ? "default" : "secondary"}>
              {agency.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">License Number</div>
              <div>{agency.licenseNumber || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Contact Email</div>
              <div>{agency.contactEmail || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Contact Phone</div>
              <div>{agency.contactPhone || "N/A"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Address</div>
              <div>{agency.address || "N/A"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Properties</h2>
        <AssignPropertyDialog agencyId={agencyId} />
      </div>
      <AgencyPropertiesList agencyId={agencyId} />

      <h2 className="text-2xl font-bold">Members ({members.length})</h2>
      <AgencyMembersList agencyId={agencyId} />
    </div>
  )
}

