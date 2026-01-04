import { Suspense } from "react"
import { AdminStats } from "./_components/admin-stats"
import { AdminStatsSkeleton } from "./_components/admin-stats-skeleton"

// Prevent static generation - this page requires database access
export const dynamic = "force-dynamic"

export default async function AdminPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">System overview and management</p>
      </div>
      <Suspense fallback={<AdminStatsSkeleton />}>
        <AdminStats />
      </Suspense>
    </div>
  )
}

