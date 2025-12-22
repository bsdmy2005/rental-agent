import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getBillsByPropertyIdQuery } from "@/queries/bills-queries"
import { getMatchesByBillIdsQuery } from "@/queries/period-bill-matches-queries"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get("propertyId")

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 })
    }

    // Get all bills for this property
    const allBills = await getBillsByPropertyIdQuery(propertyId)

    // Get all matches for these bills
    const billIds = allBills.map((b) => b.id)
    const matches = await getMatchesByBillIdsQuery(billIds)

    // Find unmatched bills (bills without a match)
    const unmatchedBills = allBills.filter((bill) => !matches.has(bill.id))

    return NextResponse.json({
      success: true,
      bills: unmatchedBills
    })
  } catch (error) {
    console.error("Error fetching unmatched bills:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

