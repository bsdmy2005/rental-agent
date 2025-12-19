"use client"

import { PropertyWithDetails } from "@/queries/properties-queries"
import { PropertyExpandableRow } from "./property-expandable-row"

interface PropertiesListClientProps {
  properties: PropertyWithDetails[]
}

export function PropertiesListClient({ properties }: PropertiesListClientProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No properties found.</p>
        <p className="text-muted-foreground text-sm">Create your first property to get started.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Property Name
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Address
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Type
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <PropertyExpandableRow key={property.id} property={property} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

