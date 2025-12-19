"use server"

import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PropertiesList } from "./_components/properties-list"
import { PropertiesListSkeleton } from "./_components/properties-list-skeleton"

export default async function PropertiesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">View Properties</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage and edit your properties
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/properties/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      <Suspense fallback={<PropertiesListSkeleton />}>
        <PropertiesList />
      </Suspense>
    </div>
  )
}

