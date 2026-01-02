"use server"

import { Suspense } from "react"
import { AgenciesList } from "./_components/agencies-list"
import { AgenciesListSkeleton } from "./_components/agencies-list-skeleton"

export default async function AdminAgenciesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rental Agencies</h1>
      </div>
      <Suspense fallback={<AgenciesListSkeleton />}>
        <AgenciesList />
      </Suspense>
    </div>
  )
}

