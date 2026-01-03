"use server"

import { Suspense } from "react"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import {
  movingInspectionsTable,
  movingInspectionItemsTable,
  movingInspectionCategoriesTable
} from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"
import { InspectionDashboardClient } from "./_components/inspection-dashboard-client"
import { InspectionDashboardSkeleton } from "./_components/inspection-dashboard-skeleton"

async function getAllInspectionItems() {
  const { userId } = await auth()
  if (!userId) {
    return []
  }

  // Get all inspections for the user
  const inspections = await db
    .select()
    .from(movingInspectionsTable)
    .where(eq(movingInspectionsTable.inspectedBy, userId))

  if (inspections.length === 0) {
    return []
  }

  const inspectionIds = inspections.map((i) => i.id)

  // Get all items with their categories and inspection info
  const items = await db
    .select({
      id: movingInspectionItemsTable.id,
      name: movingInspectionItemsTable.name,
      condition: movingInspectionItemsTable.condition,
      notes: movingInspectionItemsTable.notes,
      confirmedAsPrevious: movingInspectionItemsTable.confirmedAsPrevious,
      createdAt: movingInspectionItemsTable.createdAt,
      updatedAt: movingInspectionItemsTable.updatedAt,
      category: {
        id: movingInspectionCategoriesTable.id,
        name: movingInspectionCategoriesTable.name,
        displayOrder: movingInspectionCategoriesTable.displayOrder
      },
      inspection: {
        id: movingInspectionsTable.id,
        inspectionType: movingInspectionsTable.inspectionType,
        status: movingInspectionsTable.status,
        createdAt: movingInspectionsTable.createdAt
      }
    })
    .from(movingInspectionItemsTable)
    .innerJoin(
      movingInspectionCategoriesTable,
      eq(movingInspectionItemsTable.categoryId, movingInspectionCategoriesTable.id)
    )
    .innerJoin(
      movingInspectionsTable,
      eq(movingInspectionItemsTable.inspectionId, movingInspectionsTable.id)
    )
    .where(inArray(movingInspectionItemsTable.inspectionId, inspectionIds))

  return items
}

export default async function InspectionDashboardPage() {
  const items = await getAllInspectionItems()

  // Filter out items with null conditions since the component expects non-null conditions
  const itemsWithConditions = items.filter(
    (item): item is typeof item & { condition: NonNullable<typeof item.condition> } =>
      item.condition !== null
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inspection Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          View and filter inspection items by condition and room
        </p>
      </div>

      <Suspense fallback={<InspectionDashboardSkeleton />}>
        <InspectionDashboardClient initialItems={itemsWithConditions} />
      </Suspense>
    </div>
  )
}

