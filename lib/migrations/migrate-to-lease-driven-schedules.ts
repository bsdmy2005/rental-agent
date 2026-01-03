"use server"

/**
 * Data migration script to generate billing periods for existing tenants
 * and match existing bills to periods.
 * 
 * Run this after pushing the schema changes to the database.
 * 
 * Usage: This is a one-time migration script. You can call it manually or
 * create an API route to trigger it.
 */

import { db } from "@/db"
import { tenantsTable, billsTable } from "@/db/schema"
import { generateInvoicePeriodsForLeaseAction } from "@/actions/billing-periods-actions"
import { matchBillToPeriod } from "@/lib/period-bill-matcher"
import { getLeaseAgreementByTenantIdQuery } from "@/queries/lease-agreements-queries"

export async function migrateToLeaseDrivenSchedules() {
  console.log("[Migration] Starting migration to lease-driven schedules...")

  try {
    // Get all tenants with lease dates
    const tenants = await db.select().from(tenantsTable)

    let periodsGenerated = 0
    let billsMatched = 0
    const errors: string[] = []

    for (const tenant of tenants) {
      try {
        // Check if tenant has a lease agreement
        const leaseAgreement = await getLeaseAgreementByTenantIdQuery(tenant.id)

        if (leaseAgreement && leaseAgreement.effectiveStartDate && leaseAgreement.effectiveEndDate) {
          // Generate invoice periods for this lease
          const result = await generateInvoicePeriodsForLeaseAction(
            tenant.propertyId,
            tenant.id,
            leaseAgreement.id,
            leaseAgreement.effectiveStartDate,
            leaseAgreement.effectiveEndDate
          )

          if (result.isSuccess && result.data) {
            periodsGenerated += result.data.length
            console.log(
              `[Migration] Generated ${result.data.length} invoice periods for tenant ${tenant.id}`
            )
          }
        } else if (tenant.leaseStartDate && tenant.leaseEndDate) {
          // Fallback: Use legacy lease dates if no lease agreement exists
          // Note: This won't generate periods without a lease agreement, but we log it
          console.log(
            `[Migration] Tenant ${tenant.id} has legacy lease dates but no lease agreement. Skipping period generation.`
          )
        }
      } catch (error) {
        const errorMsg = `Error processing tenant ${tenant.id}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(`[Migration] ${errorMsg}`)
      }
    }

    // Match existing bills to periods
    console.log("[Migration] Matching existing bills to periods...")
    const allBills = await db.select().from(billsTable)

    for (const bill of allBills) {
      try {
        if (bill.billingYear && bill.billingMonth) {
          await matchBillToPeriod(bill, "automatic")
          billsMatched++
        }
      } catch (error) {
        const errorMsg = `Error matching bill ${bill.id}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(`[Migration] ${errorMsg}`)
      }
    }

    console.log(`[Migration] ✓ Migration completed`)
    console.log(`[Migration]   Periods generated: ${periodsGenerated}`)
    console.log(`[Migration]   Bills matched: ${billsMatched}`)
    console.log(`[Migration]   Errors: ${errors.length}`)

    return {
      success: true,
      periodsGenerated,
      billsMatched,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error("[Migration] Fatal error during migration:", error)
    throw error
  }
}

