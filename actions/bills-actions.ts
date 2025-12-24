"use server"

import { db } from "@/db"
import { billsTable, type InsertBill, type SelectBill } from "@/db/schema"
import { ActionState } from "@/types"
import { eq, and, isNull } from "drizzle-orm"
import { getBillByIdQuery, getBillsByPropertyIdQuery } from "@/queries/bills-queries"

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

/**
 * Link a bill to a bill template
 * Matching priority:
 * 1. If bill has invoiceRuleId or paymentRuleId, find template with matching extractionRuleId
 * 2. Fallback: Find first active template matching billType + propertyId
 * 
 * Also triggers:
 * - Arrival schedule compliance check
 * - Generation checks for payables/invoices that depend on this template
 */
export async function linkBillToTemplate(
  billId: string,
  bill: SelectBill
): Promise<string | null> {
  // Skip if bill already has a template
  if (bill.billTemplateId) {
    return bill.billTemplateId
  }

  try {
    const {
      findBillTemplateByExtractionRuleAction,
      findBillTemplateByBillTypeAndPropertyAction
    } = await import("@/actions/bill-templates-actions")

    let templateResult: { isSuccess: boolean; data: any } | null = null

    // Priority 1: Try to match by extraction rule ID
    if (bill.invoiceRuleId || bill.paymentRuleId) {
      const ruleId = bill.invoiceRuleId || bill.paymentRuleId
      if (ruleId) {
        templateResult = await findBillTemplateByExtractionRuleAction(
          bill.propertyId,
          ruleId
        )
        if (templateResult.isSuccess && templateResult.data) {
          console.log(
            `[Bill Template Linking] Found template by extraction rule: ${templateResult.data.id} for bill ${billId}`
          )
        }
      }
    }

    // Priority 2: Fallback to billType + propertyId matching
    if (!templateResult?.isSuccess || !templateResult.data) {
      templateResult = await findBillTemplateByBillTypeAndPropertyAction(
        bill.propertyId,
        bill.billType
      )
      if (templateResult.isSuccess && templateResult.data) {
        console.log(
          `[Bill Template Linking] Found template by billType: ${templateResult.data.id} for bill ${billId}`
        )
      }
    }

    // Link the template if found
    if (templateResult.isSuccess && templateResult.data) {
      await db
        .update(billsTable)
        .set({ billTemplateId: templateResult.data.id })
        .where(eq(billsTable.id, billId))
      console.log(
        `[Bill Template Linking] ✓ Linked bill ${billId} to template ${templateResult.data.id}`
      )

      // Check arrival schedule compliance if schedule exists
      try {
        const { getBillArrivalScheduleByTemplateIdAction } = await import(
          "@/actions/bill-arrival-schedules-actions"
        )
        const scheduleResult = await getBillArrivalScheduleByTemplateIdAction(
          templateResult.data.id
        )

        if (scheduleResult.isSuccess && scheduleResult.data && bill.billingMonth) {
          const expectedDay = scheduleResult.data.expectedDayOfMonth
          console.log(
            `[Bill Template Linking] Template expects arrival on day ${expectedDay} of month`
          )
        }
      } catch (scheduleError) {
        // Log but don't fail
        console.error("[Bill Template Linking] Error checking arrival schedule:", scheduleError)
      }

      // Trigger generation checks for payables and invoices that depend on this bill template
      if (bill.billingYear && bill.billingMonth) {
        try {
          const { checkAndGeneratePayables, checkAndGenerateInvoices } = await import(
            "@/lib/generation-triggers"
          )
          await checkAndGeneratePayables(
            bill.propertyId,
            bill.billingYear,
            bill.billingMonth
          )
          await checkAndGenerateInvoices(
            bill.propertyId,
            bill.billingYear,
            bill.billingMonth
          )
          console.log(
            `[Bill Template Linking] ✓ Triggered generation checks for period ${bill.billingYear}-${bill.billingMonth}`
          )
        } catch (generationError) {
          // Log but don't fail
          console.error("[Bill Template Linking] Error triggering generation:", generationError)
        }
      }

      return templateResult.data.id
    }

    console.log(
      `[Bill Template Linking] No template found for bill ${billId} (property: ${bill.propertyId}, type: ${bill.billType})`
    )
    return null
  } catch (templateError) {
    // Log error but don't fail (templates are optional)
    console.error("[Bill Template Linking] Error linking bill to template:", templateError)
    return null
  }
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

      // Update bill with extracted data and track which rules were used
      const updateData: Partial<typeof billsTable.$inferInsert> = {
        status: "processed",
        invoiceRuleId: invoiceRule?.id || null,
        paymentRuleId: paymentRule?.id || null
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

      // CRITICAL: Link bill to template FIRST before period matching
      // Template linking is required for proper dependency validation during period matching
      console.log(`[Bill Processing] Linking bill ${billId} to template before period matching...`)
      const templateLinkResult = await linkBillToTemplate(billId, processedBill)
      
      // Get updated bill after template linking
      const billWithTemplate = await db.query.bills.findFirst({
        where: eq(billsTable.id, billId)
      })

      if (!billWithTemplate) {
        return { isSuccess: false, message: "Failed to retrieve bill after template linking" }
      }

      // If template linking failed, skip period matching (log clearly)
      if (!billWithTemplate.billTemplateId) {
        console.warn(`[Bill Processing] ⚠ Template linking failed for bill ${billId}. Skipping period matching.`)
        console.warn(`[Bill Processing]   Bill must have a template ID before period matching can occur.`)
        return {
          isSuccess: true,
          message: "Bill processed but template linking failed - period matching skipped",
          data: billWithTemplate
        }
      }

      console.log(`[Bill Processing] ✓ Bill ${billId} linked to template ${billWithTemplate.billTemplateId}`)

      // Process period extraction and auto-matching using reusable function
      // This handles period inference and matching to all compatible periods
      // Now that bill has template ID, matching can validate template dependencies correctly
      try {
        const { processBillPeriod } = await import("@/lib/bill-period-processing")
        const periodResult = await processBillPeriod(
          billId,
          invoiceData || null,
          paymentData || null,
          processedBill.fileName
        )
        
        if (periodResult.periodSet) {
          console.log(`[Bill Processing] ✓ Period processing completed for bill ${billId}`)
        }
        
        if (periodResult.matched) {
          console.log(
            `[Bill Processing] ✓ Auto-matched bill ${billId} to ${periodResult.matchedPeriods.length} period(s): ${periodResult.matchedPeriods.map(m => `${m.periodType}:${m.periodId}`).join(", ")}`
          )
        } else {
          console.log(
            `[Bill Processing] ⚠ Bill ${billId} was not auto-matched to any periods. Can be manually matched later.`
          )
        }
      } catch (periodError) {
          // Log error but don't fail the bill processing
        console.error(`[Bill Processing] Error processing period for bill ${billId}:`, periodError)
        if (periodError instanceof Error) {
          console.error(`[Bill Processing]   Error message: ${periodError.message}`)
        }
      }

      // Get final bill after period processing (period may have been set)
      const finalBill = await db.query.bills.findFirst({
        where: eq(billsTable.id, billId)
      })

      if (!finalBill) {
        return { isSuccess: false, message: "Failed to retrieve bill after period processing" }
      }

      // NEW: Check for matching billing schedule and link bill (non-breaking)
      // This integration is optional - bills work fine without schedules
      try {
        if (finalBill.billingYear && finalBill.billingMonth) {
          const { findMatchingScheduleForBill, markBillAsFulfillingSchedule } = await import(
            "@/lib/billing-schedule-compliance"
          )

          const matchingSchedule = await findMatchingScheduleForBill(
            finalBill.propertyId,
            finalBill.billType,
            finalBill.billingYear,
            finalBill.billingMonth
          )

          if (matchingSchedule) {
            await markBillAsFulfillingSchedule(
              finalBill.id,
              matchingSchedule.id,
              finalBill.billingYear,
              finalBill.billingMonth
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

      // Update existing payable instances that reference this bill
      // This ensures payableData is populated even if instance was created before bill processing
      if (paymentData && finalBill.billingYear && finalBill.billingMonth) {
        try {
          const { updatePayableInstanceFromBills } = await import("@/lib/generation-triggers")
          const { payableInstancesTable } = await import("@/db/schema")
          const { db } = await import("@/db")
          
          // Find all payable instances that have this bill in their contributingBillIds
          const payableInstances = await db.query.payableInstances.findMany({
            where: (instances, { eq, and }) => and(
              eq(instances.propertyId, finalBill.propertyId),
              eq(instances.periodYear, finalBill.billingYear),
              eq(instances.periodMonth, finalBill.billingMonth)
            )
          })

          // Update each instance that references this bill
          for (const instance of payableInstances) {
            if (instance.contributingBillIds && Array.isArray(instance.contributingBillIds)) {
              const billIds = instance.contributingBillIds as string[]
              if (billIds.includes(finalBill.id)) {
                await updatePayableInstanceFromBills(instance.id)
              }
            }
          }
        } catch (payableUpdateError) {
          console.error("Error updating payable instances:", payableUpdateError)
          // Don't fail the bill processing if payable update fails
        }
      }

      return {
        isSuccess: true,
        message: "Bill processed successfully",
        data: finalBill
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

/**
 * Backfill bill template links for existing bills that don't have templates assigned
 * Links bills to templates using the same priority logic as linkBillToTemplate
 * 
 * @param propertyId - Optional property ID to limit backfill to a specific property
 * @returns ActionState with count of bills updated
 */
export async function backfillBillTemplateLinksAction(
  propertyId?: string
): Promise<ActionState<{ updatedCount: number; totalProcessed: number }>> {
  try {
    // Query bills without template IDs that are processed
    let billsToUpdate: SelectBill[]
    
    if (propertyId) {
      // Get all bills for the property and filter
      const allBills = await getBillsByPropertyIdQuery(propertyId)
      billsToUpdate = allBills.filter(
        (bill) => !bill.billTemplateId && bill.status === "processed"
      )
    } else {
      // Get all processed bills without template IDs across all properties
      billsToUpdate = await db
        .select()
        .from(billsTable)
        .where(and(isNull(billsTable.billTemplateId), eq(billsTable.status, "processed")))
    }

    console.log(
      `[Bill Template Backfill] Found ${billsToUpdate.length} bills without template IDs to process`
    )

    let updatedCount = 0
    let errorCount = 0

    // Process each bill
    for (const bill of billsToUpdate) {
      try {
        const linkedTemplateId = await linkBillToTemplate(bill.id, bill)
        if (linkedTemplateId) {
          updatedCount++
          console.log(
            `[Bill Template Backfill] ✓ Linked bill ${bill.id} to template ${linkedTemplateId}`
          )
        } else {
          console.log(
            `[Bill Template Backfill] No template found for bill ${bill.id} (property: ${bill.propertyId}, type: ${bill.billType})`
          )
        }
      } catch (error) {
        errorCount++
        console.error(`[Bill Template Backfill] Error processing bill ${bill.id}:`, error)
        // Continue with next bill
      }
    }

    console.log(
      `[Bill Template Backfill] Completed: ${updatedCount} linked, ${errorCount} errors, ${billsToUpdate.length - updatedCount - errorCount} skipped`
    )

    return {
      isSuccess: true,
      message: `Backfill completed: ${updatedCount} bills linked to templates`,
      data: {
        updatedCount,
        totalProcessed: billsToUpdate.length
      }
    }
  } catch (error) {
    console.error("Error backfilling bill template links:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to backfill bill template links"
    }
  }
}

