"use server"

import { Suspense } from "react"
import { getRentalAgencyByIdQuery } from "@/queries/rental-agencies-queries"
import { AgencyDetails } from "./_components/agency-details"
import { AgencyDetailsSkeleton } from "./_components/agency-details-skeleton"
import { notFound } from "next/navigation"

export default async function AgencyDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agency = await getRentalAgencyByIdQuery(id)

  if (!agency) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">{agency.name}</h1>
        <p className="text-muted-foreground mt-2">Agency Management</p>
      </div>
      <Suspense fallback={<AgencyDetailsSkeleton />}>
        <AgencyDetails agencyId={id} />
      </Suspense>
    </div>
  )
}

