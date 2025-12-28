"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { LeasesList } from "./_components/leases-list"
import { LeasesListSkeleton } from "./_components/leases-list-skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function LeasesPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Agreements</h1>
          <p className="text-muted-foreground mt-2">
            Manage lease agreements and track signing status.
          </p>
        </div>
      </div>

      <div>
        <Suspense fallback={<LeasesListSkeleton />}>
          <LeasesList />
        </Suspense>
      </div>
    </div>
  )
}

