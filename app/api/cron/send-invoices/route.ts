import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import {
  rentalInvoiceInstancesTable,
  rentalInvoiceTemplatesTable
} from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { sendInvoiceEmailAction } from "@/lib/email/invoice-email-service"

// Mark this route as dynamic to prevent static generation
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Cron job endpoint to automatically send invoices on scheduled dates
 * Runs daily
 * 
 * Authentication: Uses CRON_SECRET from environment variables
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[Cron Send Invoices] CRON_SECRET not set in environment variables")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron Send Invoices] Unauthorized cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[Cron Send Invoices] Starting automatic invoice sending...")

    const now = new Date()
    const currentDay = now.getDate()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Query all rental invoice instances where:
    // - status = "generated" (ready to send)
    // - Template's generationDayOfMonth matches today's day
    // - Period is current or past period
    const readyInstances = await db
      .select({
        instance: rentalInvoiceInstancesTable,
        template: rentalInvoiceTemplatesTable
      })
      .from(rentalInvoiceInstancesTable)
      .innerJoin(
        rentalInvoiceTemplatesTable,
        eq(
          rentalInvoiceInstancesTable.rentalInvoiceTemplateId,
          rentalInvoiceTemplatesTable.id
        )
      )
      .where(
        and(
          eq(rentalInvoiceInstancesTable.status, "generated"),
          eq(rentalInvoiceTemplatesTable.generationDayOfMonth, currentDay),
          eq(rentalInvoiceTemplatesTable.isActive, true)
        )
      )

    // Filter to only include instances where period is current or past
    const instancesToSend = readyInstances.filter((item) => {
      const instance = item.instance
      // Period is current or past if year/month is <= current year/month
      if (instance.periodYear < currentYear) {
        return true
      }
      if (instance.periodYear === currentYear && instance.periodMonth <= currentMonth) {
        return true
      }
      return false
    })

    console.log(
      `[Cron Send Invoices] Found ${instancesToSend.length} invoice(s) ready to send`
    )

    let sentCount = 0
    const errors: Array<{ instanceId: string; error: string }> = []

    // Send each invoice
    for (const item of instancesToSend) {
      try {
        const result = await sendInvoiceEmailAction(item.instance.id)
        if (result.isSuccess) {
          sentCount++
          console.log(
            `[Cron Send Invoices] ✓ Sent invoice ${item.instance.id} (${item.template.name})`
          )
        } else {
          errors.push({
            instanceId: item.instance.id,
            error: result.message || "Unknown error"
          })
          console.error(
            `[Cron Send Invoices] ✗ Failed to send invoice ${item.instance.id}: ${result.message}`
          )
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error)
        errors.push({
          instanceId: item.instance.id,
          error: errorMsg
        })
        console.error(
          `[Cron Send Invoices] ✗ Error sending invoice ${item.instance.id}: ${errorMsg}`
        )
      }
    }

    console.log(
      `[Cron Send Invoices] ✓ Completed. Sent ${sentCount} invoice(s), ${errors.length} error(s)`
    )

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} invoice(s)`,
      sentCount,
      totalFound: instancesToSend.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("[Cron Send Invoices] Error in cron job:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

