"use server"

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getMovingInspectionAction } from "@/actions/moving-inspections-actions"
import { MovingInspectionDetail } from "./_components/moving-inspection-detail"
import { MovingInspectionDetailSkeleton } from "./_components/moving-inspection-detail-skeleton"
import type { ComponentProps } from "react"

type InspectionData = ComponentProps<typeof MovingInspectionDetail>["inspection"]

// UUID validation regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

export default async function MovingInspectionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Validate UUID before querying to prevent "new" from being treated as UUID
  if (!isValidUUID(id)) {
    notFound()
  }
  
  const result = await getMovingInspectionAction(id)

  if (!result.isSuccess || !result.data) {
    notFound()
  }

  // Map the data to match the component's expected structure
  const inspectionData = {
    id: result.data.id,
    inspectionType: result.data.inspectionType,
    status: result.data.status,
    isLocked: result.data.isLocked,
    signedByLandlord: result.data.signedByLandlord,
    signedByTenant: result.data.signedByTenant,
    signedByInspector: result.data.signedByInspector,
    inspectedByThirdParty: result.data.inspectedByThirdParty,
    inspectorName: result.data.inspectorName,
    inspectorEmail: result.data.inspectorEmail,
    inspectorCompany: result.data.inspectorCompany,
    inspectorPhone: result.data.inspectorPhone,
    createdAt: result.data.createdAt,
    items: result.data.items.map((item) => ({
      id: item.id,
      name: item.name,
      condition: item.condition,
      isPresent: item.isPresent,
      notes: item.notes,
      category: item.category,
      defects: item.defects
    }))
  } as InspectionData

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<MovingInspectionDetailSkeleton />}>
        <MovingInspectionDetail inspection={inspectionData} />
      </Suspense>
    </div>
  )
}

