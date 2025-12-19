"use client"

import { TenantWithProperty } from "@/queries/tenants-queries"
import { TenantTableRow } from "./tenant-table-row"

interface TenantsListClientProps {
  tenants: TenantWithProperty[]
}

export function TenantsListClient({ tenants }: TenantsListClientProps) {
  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No tenants found.</p>
        <p className="text-muted-foreground text-sm">Add tenants to your properties to get started.</p>
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
                Name
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Property
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                ID Number
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Rental Amount
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Email
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Phone
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Lease Start
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Lease End
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <TenantTableRow key={tenant.id} tenant={tenant} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

