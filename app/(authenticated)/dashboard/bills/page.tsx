"use server"

import { Suspense } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { BillsList } from "./_components/bills-list"
import { BillsListSkeleton } from "./_components/bills-list-skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function BillsPage() {
  const user = await currentUser()
  const userProfile = user ? await getUserProfileByClerkIdQuery(user.id) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-muted-foreground mt-2">
            View all bills that have been uploaded or received via email across your properties.
          </p>
        </div>

        {userProfile && (
          <Button asChild>
            <Link href="/dashboard/bills/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload Bills
            </Link>
          </Button>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Uploaded Bills</h2>
        <Suspense fallback={<BillsListSkeleton />}>
          <BillsList />
        </Suspense>
      </div>
    </div>
  )
}

