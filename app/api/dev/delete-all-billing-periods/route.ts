import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { deleteAllBillingPeriodsAction } from "@/actions/billing-periods-actions"

/**
 * DEV ONLY: Delete all billing periods from the system
 * This endpoint should be removed or protected in production
 */
export async function POST() {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      )
    }

    const result = await deleteAllBillingPeriodsAction()

    if (result.isSuccess) {
      return NextResponse.json({
        success: true,
        message: result.message,
        deletedCount: result.data
      })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in delete-all-billing-periods API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

