import { NextRequest, NextResponse } from "next/server"
import { ensurePayablePeriodsRollingWindowAction } from "@/actions/billing-periods-actions"

/**
 * Cron job endpoint to ensure payable periods have a 24-month rolling window
 * Runs monthly (1st of each month)
 * 
 * Authentication: Uses CRON_SECRET from environment variables
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[Cron] CRON_SECRET not set in environment variables")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron] Starting payable periods rolling window generation...")

    // Get all properties (we need to iterate through all landlords and rental agents)
    // For simplicity, we'll get all active properties
    // In production, you might want to add a more efficient query
    const { db } = await import("@/db")
    const { propertiesTable } = await import("@/db/schema")
    const allProperties = await db.select({ id: propertiesTable.id }).from(propertiesTable)

    let totalGenerated = 0
    const errors: string[] = []

    // Process each property
    for (const property of allProperties) {
      try {
        const result = await ensurePayablePeriodsRollingWindowAction(property.id)
        if (result.isSuccess && result.data) {
          totalGenerated += result.data.length
          console.log(
            `[Cron] Generated ${result.data.length} periods for property ${property.id}`
          )
        }
      } catch (error) {
        const errorMsg = `Error processing property ${property.id}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(`[Cron] ${errorMsg}`)
      }
    }

    console.log(`[Cron] ✓ Completed. Generated ${totalGenerated} periods across ${allProperties.length} properties`)

    return NextResponse.json({
      success: true,
      message: `Generated ${totalGenerated} payable periods`,
      propertiesProcessed: allProperties.length,
      periodsGenerated: totalGenerated,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("[Cron] Error in cron job:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

