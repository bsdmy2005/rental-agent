import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getAllMatchesByBillIdQuery } from "@/queries/period-bill-matches-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { billId } = await params

    if (!billId) {
      return NextResponse.json({ error: "billId is required" }, { status: 400 })
    }

    const matches = await getAllMatchesByBillIdQuery(billId)

    return NextResponse.json({
      success: true,
      matches
    })
  } catch (error) {
    console.error("Error fetching bill matches:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

