import { Suspense } from "react"
import { LeaseTemplatesList } from "./_components/lease-templates-list"
import { LeaseTemplatesListSkeleton } from "./_components/lease-templates-list-skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Prevent static generation - this page requires database access
export const dynamic = "force-dynamic"

export default async function LeaseTemplatesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Templates</h1>
          <p className="text-muted-foreground">
            Manage lease agreement templates for creating new leases
          </p>
        </div>
        <Link href="/dashboard/lease-templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      <Suspense fallback={<LeaseTemplatesListSkeleton />}>
        <LeaseTemplatesList />
      </Suspense>
    </div>
  )
}

