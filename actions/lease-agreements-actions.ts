"use server"

import { db } from "@/db"
import { leaseAgreementsTable, type InsertLeaseAgreement, type SelectLeaseAgreement } from "@/db/schema"
import { ActionState } from "@/types"
import { eq } from "drizzle-orm"
import { extractLeaseDatesFromPDF } from "@/lib/lease-extraction"
import { uploadPDFToSupabase } from "@/lib/storage/supabase-storage"

export async function uploadLeaseAgreementAction(
  tenantId: string,
  propertyId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    console.log(`[Lease Upload] Starting upload for tenant: ${tenantId}, file: ${fileName}`)

    // Upload file to storage
    const storagePath = `lease-agreements/${propertyId}/${tenantId}/${fileName}`
    const fileUrl = await uploadPDFToSupabase(fileBuffer, storagePath)

    // Extract dates from PDF
    let extractedData: Awaited<ReturnType<typeof extractLeaseDatesFromPDF>> | null = null
    let extractedStartDate: Date | null = null
    let extractedEndDate: Date | null = null

    try {
      extractedData = await extractLeaseDatesFromPDF(fileBuffer, fileName)
      extractedStartDate = new Date(extractedData.startDate)
      extractedEndDate = new Date(extractedData.endDate)

      // Validate dates
      if (isNaN(extractedStartDate.getTime()) || isNaN(extractedEndDate.getTime())) {
        throw new Error("Invalid dates extracted from lease")
      }

      if (extractedEndDate < extractedStartDate) {
        throw new Error("Lease end date is before start date")
      }
    } catch (extractionError) {
      console.error("[Lease Upload] Error extracting dates:", extractionError)
      // Continue with null dates - user can manually enter them
    }

    // Use extracted dates as effective dates (user can override later)
    const effectiveStartDate = extractedStartDate || new Date()
    const effectiveEndDate = extractedEndDate || new Date()

    // Create lease agreement record
    const leaseData: InsertLeaseAgreement = {
      tenantId,
      propertyId,
      fileName,
      fileUrl,
      extractedStartDate: extractedStartDate || null,
      extractedEndDate: extractedEndDate || null,
      manualStartDate: null,
      manualEndDate: null,
      effectiveStartDate,
      effectiveEndDate,
      extractionData: extractedData ? (extractedData as unknown as Record<string, unknown>) : null,
      status: extractedData ? "processed" : "pending"
    }

    const [newLease] = await db.insert(leaseAgreementsTable).values(leaseData).returning()

    if (!newLease) {
      return { isSuccess: false, message: "Failed to create lease agreement" }
    }

    console.log(`[Lease Upload] ✓ Lease agreement created: ${newLease.id}`)

    // Automatically generate invoice periods for this lease
    if (extractedData && extractedStartDate && extractedEndDate) {
      try {
        const { generateInvoicePeriodsForLeaseAction } = await import("@/actions/billing-periods-actions")
        await generateInvoicePeriodsForLeaseAction(
          propertyId,
          tenantId,
          newLease.id,
          effectiveStartDate,
          effectiveEndDate
        )
        console.log(`[Lease Upload] ✓ Generated invoice periods for lease ${newLease.id}`)
      } catch (periodError) {
        // Log error but don't fail lease creation
        console.error(`[Lease Upload] Error generating invoice periods:`, periodError)
      }
    }

    return {
      isSuccess: true,
      message: "Lease agreement uploaded successfully",
      data: newLease
    }
  } catch (error) {
    console.error("Error uploading lease agreement:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to upload lease agreement"
    }
  }
}

export async function updateLeaseDatesAction(
  leaseAgreementId: string,
  manualStartDate: Date | null,
  manualEndDate: Date | null
): Promise<ActionState<SelectLeaseAgreement>> {
  try {
    const lease = await db.query.leaseAgreements.findFirst({
      where: eq(leaseAgreementsTable.id, leaseAgreementId)
    })

    if (!lease) {
      return { isSuccess: false, message: "Lease agreement not found" }
    }

    // Determine effective dates: manual override takes precedence, then extracted, then fallback
    const effectiveStartDate = manualStartDate || lease.extractedStartDate || new Date()
    const effectiveEndDate = manualEndDate || lease.extractedEndDate || new Date()

    // Validate dates
    if (effectiveEndDate < effectiveStartDate) {
      return { isSuccess: false, message: "End date must be after start date" }
    }

    const [updatedLease] = await db
      .update(leaseAgreementsTable)
      .set({
        manualStartDate: manualStartDate || null,
        manualEndDate: manualEndDate || null,
        effectiveStartDate,
        effectiveEndDate,
        updatedAt: new Date()
      })
      .where(eq(leaseAgreementsTable.id, leaseAgreementId))
      .returning()

    if (!updatedLease) {
      return { isSuccess: false, message: "Failed to update lease dates" }
    }

    // Regenerate invoice periods when lease dates change
    try {
      const { regenerateInvoicePeriodsAction } = await import("@/actions/billing-periods-actions")
      await regenerateInvoicePeriodsAction(leaseAgreementId, effectiveStartDate, effectiveEndDate)
      console.log(`[Lease Update] ✓ Regenerated invoice periods for lease ${leaseAgreementId}`)
    } catch (periodError) {
      // Log error but don't fail lease update
      console.error(`[Lease Update] Error regenerating invoice periods:`, periodError)
    }

    return {
      isSuccess: true,
      message: "Lease dates updated successfully",
      data: updatedLease
    }
  } catch (error) {
    console.error("Error updating lease dates:", error)
    return { isSuccess: false, message: "Failed to update lease dates" }
  }
}

export async function getLeaseAgreementByTenantIdAction(
  tenantId: string
): Promise<ActionState<SelectLeaseAgreement | null>> {
  try {
    const { getLeaseAgreementByTenantIdQuery } = await import("@/queries/lease-agreements-queries")
    const lease = await getLeaseAgreementByTenantIdQuery(tenantId)

    return {
      isSuccess: true,
      message: "Lease agreement retrieved successfully",
      data: lease
    }
  } catch (error) {
    console.error("Error getting lease agreement:", error)
    return { isSuccess: false, message: "Failed to get lease agreement" }
  }
}

