"use server"

import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getMovingInspectionAction } from "@/actions/moving-inspections-actions"
import { MovingInspectionDetail } from "./_components/moving-inspection-detail"
import { MovingInspectionDetailSkeleton } from "./_components/moving-inspection-detail-skeleton"

export default async function MovingInspectionDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

