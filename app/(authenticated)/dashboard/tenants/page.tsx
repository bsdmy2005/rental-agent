"use server"

import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TenantsList } from "./_components/tenants-list"
import { TenantsListSkeleton } from "./_components/tenants-list-skeleton"

export default async function TenantsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">View Tenants</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage and edit your tenants
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tenants/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Tenant
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TenantsListSkeleton />}>
        <TenantsList />
      </Suspense>
    </div>
  )
}

