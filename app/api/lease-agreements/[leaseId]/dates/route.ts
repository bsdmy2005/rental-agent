import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { updateLeaseDatesAction } from "@/actions/lease-agreements-actions"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leaseId } = await params
    const body = await request.json()
    const { manualStartDate, manualEndDate } = body

    const startDate = manualStartDate ? new Date(manualStartDate) : null
    const endDate = manualEndDate ? new Date(manualEndDate) : null

    const result = await updateLeaseDatesAction(leaseId, startDate, endDate)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      leaseAgreement: result.data
    })
  } catch (error) {
    console.error("Error updating lease dates:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

