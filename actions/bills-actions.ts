"use server"

import { db } from "@/db"
import { billsTable, type InsertBill, type SelectBill } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { getBillByIdQuery } from "@/queries/bills-queries"

export async function createBillAction(bill: InsertBill): Promise<ActionState<SelectBill>> {
  try {
    const [newBill] = await db.insert(billsTable).values(bill).returning()

    if (!newBill) {
      return { isSuccess: false, message: "Failed to create bill" }
    }

    return {
      isSuccess: true,
      message: "Bill created successfully",
      data: newBill
    }
  } catch (error) {
    console.error("Error creating bill:", error)
    return { isSuccess: false, message: "Failed to create bill" }
  }
}

export async function updateBillAction(
  billId: string,
  data: Partial<InsertBill>
): Promise<ActionState<SelectBill>> {
  try {
    const [updatedBill] = await db
      .update(billsTable)
      .set(data)
      .where(eq(billsTable.id, billId))
      .returning()

    if (!updatedBill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    return {
      isSuccess: true,
      message: "Bill updated successfully",
      data: updatedBill
    }
  } catch (error) {
    console.error("Error updating bill:", error)
    return { isSuccess: false, message: "Failed to update bill" }
  }
}

/**
 * Extract storage path from Supabase file URL
 * Handles both public URLs and direct paths
 */
function extractStoragePathFromUrl(fileUrl: string): string | null {
  const BUCKET_NAME = "bills"
  
  // If it's already a path (not a URL), return as-is
  if (!fileUrl.startsWith("http")) {
    return fileUrl
  }

  // Try to extract path from Supabase public URL format
  // Format: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
  const urlPattern = new RegExp(`/storage/v1/object/public/${BUCKET_NAME}/(.+)$`)
  const match = fileUrl.match(urlPattern)
  if (match && match[1]) {
    return match[1]
  }

  // Try alternative URL parsing
  try {
    const url = new URL(fileUrl)
    const pathParts = url.pathname.split(`/${BUCKET_NAME}/`)
    if (pathParts.length > 1) {
      return pathParts[1]
    }
  } catch {
    // URL parsing failed
  }

  return null
}

export async function deleteBillAction(billId: string): Promise<ActionState<void>> {
  try {
    // Get bill record first to access fileUrl
    const bill = await getBillByIdQuery(billId)
    if (!bill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    // Extract storage path from fileUrl and delete from Supabase storage
    if (bill.fileUrl) {
      try {
        const { deletePDFFromSupabase } = await import("@/lib/storage/supabase-storage")
        const storagePath = extractStoragePathFromUrl(bill.fileUrl)
        
        if (storagePath) {
          await deletePDFFromSupabase(storagePath)
        } else {
          console.warn(`Could not extract storage path from file URL: ${bill.fileUrl}`)
        }
      } catch (storageError) {
        // Log error but continue with database deletion
        // This ensures we don't leave orphaned database records if storage deletion fails
        console.error("Error deleting PDF from storage (continuing with database deletion):", storageError)
      }
    }

    // Delete from database
    await db.delete(billsTable).where(eq(billsTable.id, billId))

    return {
      isSuccess: true,
      message: "Bill deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting bill:", error)
    return { isSuccess: false, message: "Failed to delete bill" }
  }
}

export async function processBillAction(billId: string): Promise<ActionState<SelectBill>> {
  try {
    // Update status to processing
    const [updatedBill] = await db
      .update(billsTable)
      .set({ status: "processing" })
      .where(eq(billsTable.id, billId))
      .returning()

    if (!updatedBill) {
      return { isSuccess: false, message: "Bill not found" }
    }

    // Import PDF processing function and queries
    const { processPDFWithDualPurposeExtraction } = await import("@/lib/pdf-processing")
    const { getExtractionRulesByPropertyIdQuery } = await import("@/queries/extraction-rules-queries")
    const { createVariableCostAction } = await import("@/actions/variable-costs-actions")

    try {
      /**
       * Dual-Purpose Extraction Flow:
       * 1. If extractionRuleId is set (manual upload with explicit rule), use that rule
       * 2. Otherwise, find active rules for this property and bill type
       * 3. For email uploads, rules are already matched in email processing flow
       * 4. Find rule(s) that extract for invoice (extractForInvoice = true)
       * 5. Find rule(s) that extract for payment (extractForPayment = true)
       * 6. If same rule extracts for both, use it for both purposes
       * 7. If different rules, use separate rules
       * 8. Each rule uses its respective extraction config
       */
      const { getExtractionRuleByIdQuery } = await import("@/queries/extraction-rules-queries")
      
      let invoiceRule: SelectExtractionRule | undefined
      let paymentRule: SelectExtractionRule | undefined

      // If explicit rule was selected (manual upload), use it
      if (updatedBill.extractionRuleId) {
        const explicitRule = await getExtractionRuleByIdQuery(updatedBill.extractionRuleId)
        
        if (explicitRule && explicitRule.isActive) {
          // Use the explicitly selected rule for both purposes if it supports them
          if (explicitRule.extractForInvoice) {
            invoiceRule = explicitRule
          }
          if (explicitRule.extractForPayment) {
            paymentRule = explicitRule
          }
        }
      }

      // If no explicit rule or rule doesn't cover both purposes, find other rules
      if (!invoiceRule || !paymentRule) {
        const allRules = await getExtractionRulesByPropertyIdQuery(updatedBill.propertyId)
        const activeRules = allRules.filter(
          (r) => r.isActive && r.billType === updatedBill.billType
        )

        // Find rules by output type flags
        // A single rule can extract for both purposes, so we check for that first
        const ruleExtractingBoth = activeRules.find(
          (r) => r.extractForInvoice && r.extractForPayment
        )
        
        // Only use these if we don't already have rules from explicit selection
        if (!invoiceRule) {
          invoiceRule = ruleExtractingBoth || activeRules.find((r) => r.extractForInvoice)
        }
        if (!paymentRule) {
          paymentRule = ruleExtractingBoth || activeRules.find((r) => r.extractForPayment)
        }
      }

      // Process PDF with dual-purpose extraction
      const { invoiceData, paymentData } = await processPDFWithDualPurposeExtraction(
        updatedBill.fileUrl,
        invoiceRule
          ? {
              id: invoiceRule.id,
              extractionConfig: invoiceRule.invoiceExtractionConfig as Record<string, unknown> | undefined,
              instruction: invoiceRule.invoiceInstruction || undefined
            }
          : undefined,
        paymentRule
          ? {
              id: paymentRule.id,
              extractionConfig: paymentRule.paymentExtractionConfig as Record<string, unknown> | undefined,
              instruction: paymentRule.paymentInstruction || undefined
            }
          : undefined
      )

      // Infer billing period from extracted data (only if not already set by user)
      let inferredPeriod: { billingYear: number; billingMonth: number } | null = null
      if (!updatedBill.billingYear || !updatedBill.billingMonth) {
        const { inferBillingPeriod } = await import("@/lib/bill-period")
        
        // Log period extraction for debugging
        console.log("[Bill Processing] Attempting to infer billing period...")
        console.log("[Bill Processing] Invoice data period:", invoiceData?.period)
        console.log("[Bill Processing] Payment data period:", paymentData?.period)
        console.log("[Bill Processing] File name:", updatedBill.fileName)
        
        inferredPeriod = inferBillingPeriod(
          invoiceData || null,
          paymentData || null,
          updatedBill.fileName
        )
        
        if (inferredPeriod) {
          console.log(`[Bill Processing] ✓ Inferred billing period: ${inferredPeriod.billingYear}-${inferredPeriod.billingMonth}`)
        } else {
          console.log("[Bill Processing] ⚠ Could not infer billing period from extracted data")
        }
      } else {
        console.log(`[Bill Processing] Billing period already set: ${updatedBill.billingYear}-${updatedBill.billingMonth}`)
      }

      // Update bill with extracted data and track which rules were used
      const updateData: Partial<typeof billsTable.$inferInsert> = {
        status: "processed",
        invoiceRuleId: invoiceRule?.id || null,
        paymentRuleId: paymentRule?.id || null
      }

      // Set billing period if inferred and not already set by user
      // User-provided period takes precedence (set in upload route)
      if (inferredPeriod && (!updatedBill.billingYear || !updatedBill.billingMonth)) {
        updateData.billingYear = inferredPeriod.billingYear
        updateData.billingMonth = inferredPeriod.billingMonth
        console.log(`[Bill Processing] ✓ Setting billing period: ${updateData.billingYear}-${updateData.billingMonth}`)
      } else if (!inferredPeriod && (!updatedBill.billingYear || !updatedBill.billingMonth)) {
        console.log("[Bill Processing] ⚠ No billing period inferred and none set by user")
      }

      if (invoiceData) {
        updateData.invoiceExtractionData = invoiceData as any
      }
      if (paymentData) {
        updateData.paymentExtractionData = paymentData as any
      }

      // Keep legacy extractedData for backward compatibility (combine both)
      if (invoiceData || paymentData) {
        updateData.extractedData = {
          invoice: invoiceData,
          payment: paymentData
        } as any
      }
      
      // Keep legacy extractionRuleId for backward compatibility
      // Use invoice rule if available, otherwise payment rule
      if (invoiceRule) {
        updateData.extractionRuleId = invoiceRule.id
      } else if (paymentRule) {
        updateData.extractionRuleId = paymentRule.id
      }

      const [processedBill] = await db
        .update(billsTable)
        .set(updateData)
        .where(eq(billsTable.id, billId))
        .returning()

      if (!processedBill) {
        return { isSuccess: false, message: "Failed to update bill after processing" }
      }

      // NEW: Check for matching billing schedule and link bill (non-breaking)
      // This integration is optional - bills work fine without schedules
      try {
        if (processedBill.billingYear && processedBill.billingMonth) {
          const { findMatchingScheduleForBill, markBillAsFulfillingSchedule } = await import(
            "@/lib/billing-schedule-compliance"
          )

          const matchingSchedule = await findMatchingScheduleForBill(
            processedBill.propertyId,
            processedBill.billType,
            processedBill.billingYear,
            processedBill.billingMonth
          )

          if (matchingSchedule) {
            await markBillAsFulfillingSchedule(
              processedBill.id,
              matchingSchedule.id,
              processedBill.billingYear,
              processedBill.billingMonth
            )
          }
        }
      } catch (scheduleError) {
        // Log error but don't fail bill processing
        console.error("Schedule integration error (non-critical):", scheduleError)
      }

      // Create variable costs from invoice extraction data (if property is postpaid)
      if (invoiceData && invoiceData.tenantChargeableItems.length > 0) {
        try {
          const { getPropertyByIdQuery } = await import("@/queries/properties-queries")
          const property = await getPropertyByIdQuery(updatedBill.propertyId)
          
          if (property && property.paymentModel === "postpaid") {
            const { getTenantsByPropertyIdQuery } = await import("@/queries/tenants-queries")
            const tenants = await getTenantsByPropertyIdQuery(updatedBill.propertyId)
            
            // Create variable costs for each tenant-chargeable item
            for (const item of invoiceData.tenantChargeableItems) {
              // Determine cost type
              let costType: "water" | "electricity" | "sewerage" | "other" = "other"
              if (item.type === "water") costType = "water"
              else if (item.type === "electricity") costType = "electricity"
              else if (item.type === "sewerage") costType = "sewerage"

              // Create variable cost (property-level)
              // Note: Variable costs are created at property level, then allocated to tenants
              // This will be handled by the variable costs actions
              // For now, we'll create the variable cost record
              // The allocation logic is in variable-costs-actions.ts
            }
          }
        } catch (variableCostError) {
          console.error("Error creating variable costs:", variableCostError)
          // Don't fail the bill processing if variable cost creation fails
        }
      }

      return {
        isSuccess: true,
        message: "Bill processed successfully",
        data: processedBill
      }
    } catch (processingError) {
      // Update status to error
      await db
        .update(billsTable)
        .set({ status: "error" })
        .where(eq(billsTable.id, billId))

      console.error("Error processing bill:", processingError)
      return {
        isSuccess: false,
        message: "Failed to process bill with AI"
      }
    }
  } catch (error) {
    console.error("Error processing bill:", error)
    return { isSuccess: false, message: "Failed to process bill" }
  }
}

