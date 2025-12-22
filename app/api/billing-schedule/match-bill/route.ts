import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { manuallyMatchBillToPeriodAction } from "@/actions/period-bill-matching-actions"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { billId, periodId } = body

    if (!billId || !periodId) {
      return NextResponse.json(
        { error: "billId and periodId are required" },
        { status: 400 }
      )
    }

    const result = await manuallyMatchBillToPeriodAction(billId, periodId, userId)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })
  } catch (error) {
    console.error("Error matching bill to period:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

