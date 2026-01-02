"use server"

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getMovingInspectionAction } from "@/actions/moving-inspections-actions"
import { MovingInspectionDetail } from "./_components/moving-inspection-detail"
import { MovingInspectionDetailSkeleton } from "./_components/moving-inspection-detail-skeleton"

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

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<MovingInspectionDetailSkeleton />}>
        <MovingInspectionDetail inspection={result.data as any} />
      </Suspense>
    </div>
  )
}

