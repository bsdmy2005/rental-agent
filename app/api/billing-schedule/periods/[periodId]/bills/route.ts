import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getMatchesByPeriodIdQuery } from "@/queries/period-bill-matches-queries"
import { getBillByIdQuery } from "@/queries/bills-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { periodId } = await params

    if (!periodId) {
      return NextResponse.json({ error: "periodId is required" }, { status: 400 })
    }

    // Get all matches for this period
    const matches = await getMatchesByPeriodIdQuery(periodId)

    // Get all bills for these matches
    const bills = await Promise.all(matches.map((match) => getBillByIdQuery(match.billId)))
    const validBills = bills.filter((bill): bill is NonNullable<typeof bill> => bill !== null)

    return NextResponse.json({
      success: true,
      bills: validBills
    })
  } catch (error) {
    console.error("Error fetching bills for period:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

