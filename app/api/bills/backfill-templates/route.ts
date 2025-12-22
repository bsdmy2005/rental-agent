import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { backfillBillTemplateLinksAction } from "@/actions/bills-actions"

/**
 * Backfill bill template links for existing bills
 * POST /api/bills/backfill-templates
 * Optional query param: propertyId - to limit backfill to a specific property
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get optional propertyId from query params
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get("propertyId") || undefined

    const result = await backfillBillTemplateLinksAction(propertyId)

    if (result.isSuccess) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.data
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in backfill-templates API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

