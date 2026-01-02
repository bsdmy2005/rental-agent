"use server"

import { getRentalAgenciesAction } from "@/actions/db/rental-agencies-actions"
import { AgencyActions } from "./agency-actions"
import { CreateAgencyDialog } from "./create-agency-dialog"

export async function AgenciesList() {
  const result = await getRentalAgenciesAction()

  if (!result.isSuccess || !result.data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          {result.message || "Failed to load agencies"}
        </p>
      </div>
    )
  }

  const agencies = result.data

  if (agencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">No agencies found.</p>
        <CreateAgencyDialog />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateAgencyDialog />
      </div>
      <div className="rounded-md border">
        <div className="divide-y">
          {agencies.map((agency) => (
            <div key={agency.id} className="flex items-center justify-between p-4">
              <div className="flex-1">
                <a
                  href={`/admin/agencies/${agency.id}`}
                  className="font-semibold hover:underline"
                >
                  {agency.name}
                </a>
                <div className="text-muted-foreground text-sm">
                  {agency.contactEmail || "No email"}
                </div>
                <div className="text-muted-foreground text-xs">
                  {agency.isActive ? "Active" : "Inactive"} • License:{" "}
                  {agency.licenseNumber || "N/A"}
                </div>
              </div>
              <AgencyActions agency={agency} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

