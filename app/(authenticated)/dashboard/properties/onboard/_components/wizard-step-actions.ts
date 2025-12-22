"use server"

import { createPropertyAction } from "@/actions/properties-actions"
import { createBillTemplateAction } from "@/actions/bill-templates-actions"
import { createBillArrivalScheduleAction } from "@/actions/bill-arrival-schedules-actions"
import { createPayableTemplateAction } from "@/actions/payable-templates-actions"
import { createPayableScheduleAction } from "@/actions/payable-schedules-actions"
import { createTenantAction } from "@/actions/tenants-actions"
import { uploadLeaseAgreementAction } from "@/actions/lease-agreements-actions"
import { createRentalInvoiceTemplateAction } from "@/actions/rental-invoice-templates-actions"
import { createExtractionRuleAction } from "@/actions/extraction-rules-actions"
import { generateInvoicePeriodsForLeaseAction } from "@/actions/billing-periods-actions"
import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import type { WizardState, BillTemplateState, PayableTemplateState, TenantState } from "./wizard-state"
import type { FieldMapping } from "@/app/(authenticated)/dashboard/rules/_components/field-mapping-builder"

/**
 * Save property to database (Step 1)
 */
export async function savePropertyStep(
  property: WizardState["property"],
  landlordId: string
): Promise<{ isSuccess: boolean; message: string; propertyId?: string }> {
  try {
    const result = await createPropertyAction({
      landlordId,
      name: property.name,
      streetAddress: property.streetAddress,
      suburb: property.suburb,
      province: property.province,
      country: property.country,
      postalCode: property.postalCode || null,
      propertyType: property.propertyType || null
    })

    if (result.isSuccess && result.data) {
      return {
        isSuccess: true,
        message: "Property saved successfully",
        propertyId: result.data.id
      }
    }

    return { isSuccess: false, message: result.message || "Failed to save property" }
  } catch (error) {
    console.error("Error saving property:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to save property"
    }
  }
}

/**
 * Save bill template and rule to database (Step 2)
 */
export async function saveBillTemplateStep(
  template: BillTemplateState,
  propertyId: string
): Promise<{ isSuccess: boolean; message: string; billTemplateId?: string; ruleId?: string }> {
  try {
    // Get user profile for rule creation
    const user = await currentUser()
    if (!user) {
      return { isSuccess: false, message: "User not authenticated" }
    }
    const userProfile = await getUserProfileByClerkIdQuery(user.id)
    if (!userProfile) {
      return { isSuccess: false, message: "User profile not found" }
    }

    // Create extraction rule if needed
    let ruleId: string | null = null
    if (template.newRule) {
      // Convert field mappings to extraction configs
      const convertMappingsToConfig = (mappings: FieldMapping[]): Record<string, unknown> => {
        const fieldMappings: Record<string, unknown> = {}
        mappings.forEach((mapping) => {
          fieldMappings[mapping.type] = {
            label: mapping.label,
            patterns: mapping.patterns,
            ...(mapping.extractUsage !== undefined && { extractUsage: mapping.extractUsage }),
            ...(mapping.extractBeneficiary !== undefined && { extractBeneficiary: mapping.extractBeneficiary }),
            ...(mapping.extractAccountNumber !== undefined && { extractAccountNumber: mapping.extractAccountNumber })
          }
        })
        return { fieldMappings }
      }

      const invoiceExtractionConfig =
        template.newRule.extractForInvoice && template.newRule.invoiceFieldMappings.length > 0
          ? convertMappingsToConfig(template.newRule.invoiceFieldMappings)
          : undefined

      const paymentExtractionConfig =
        template.newRule.extractForPayment && template.newRule.paymentFieldMappings.length > 0
          ? convertMappingsToConfig(template.newRule.paymentFieldMappings)
          : undefined

      const emailFilter =
        template.newRule.emailFilterFrom || template.newRule.emailFilterSubject
          ? {
              from: template.newRule.emailFilterFrom || undefined,
              subject: template.newRule.emailFilterSubject || undefined
            }
          : undefined

      const ruleResult = await createExtractionRuleAction({
        userProfileId: userProfile.id,
        propertyId,
        name: template.newRule.name || `${template.name} - Extraction Rule`,
        billType: template.billType,
        extractForInvoice: template.newRule.extractForInvoice,
        extractForPayment: template.newRule.extractForPayment,
        channel: template.newRule.channel,
        emailFilter: emailFilter as Record<string, unknown> | undefined,
        invoiceExtractionConfig: invoiceExtractionConfig,
        paymentExtractionConfig: paymentExtractionConfig,
        invoiceInstruction: template.newRule.invoiceInstruction || undefined,
        paymentInstruction: template.newRule.paymentInstruction || undefined,
        emailProcessingInstruction: template.newRule.emailProcessingInstruction || undefined,
        isActive: true
      })

      if (!ruleResult.isSuccess || !ruleResult.data) {
        return { isSuccess: false, message: "Failed to create extraction rule" }
      }

      ruleId = ruleResult.data.id
    } else if (template.ruleId) {
      ruleId = template.ruleId
    }

    // Create bill template
    const billTemplateResult = await createBillTemplateAction({
      propertyId,
      name: template.name,
      billType: template.billType,
      extractionRuleId: ruleId || null,
      description: null,
      isActive: true
    })

    if (!billTemplateResult.isSuccess || !billTemplateResult.data) {
      return { isSuccess: false, message: "Failed to create bill template" }
    }

    const billTemplateId = billTemplateResult.data.id

    // Create arrival schedule if day specified
    if (template.expectedDayOfMonth) {
      await createBillArrivalScheduleAction({
        billTemplateId,
        propertyId,
        expectedDayOfMonth: template.expectedDayOfMonth,
        isActive: true
      })
    }

    return {
      isSuccess: true,
      message: "Bill template saved successfully",
      billTemplateId,
      ruleId: ruleId || undefined
    }
  } catch (error) {
    console.error("Error saving bill template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to save bill template"
    }
  }
}

/**
 * Save payable template to database (Step 3)
 */
export async function savePayableTemplateStep(
  template: PayableTemplateState,
  propertyId: string,
  billTemplateIdMap: Record<number, string> // Map wizard index to actual bill template ID
): Promise<{ isSuccess: boolean; message: string; payableTemplateId?: string }> {
  try {
    // Map temporary bill template IDs to actual IDs
    const dependsOnBillTemplateIds = template.dependsOnBillTemplateIds
      .map((tempId) => {
        // tempId format: "temp-{index}"
        const billIndex = parseInt(tempId.replace("temp-", ""))
        return billTemplateIdMap[billIndex]
      })
      .filter(Boolean) as string[]

    const payableTemplateResult = await createPayableTemplateAction({
      propertyId,
      name: template.name,
      dependsOnBillTemplateIds,
      isActive: true
    })

    if (!payableTemplateResult.isSuccess || !payableTemplateResult.data) {
      return { isSuccess: false, message: "Failed to create payable template" }
    }

    const payableTemplateId = payableTemplateResult.data.id

    // Create payable schedule if day specified
    if (template.scheduledDayOfMonth) {
      await createPayableScheduleAction({
        payableTemplateId,
        propertyId,
        scheduledDayOfMonth: template.scheduledDayOfMonth,
        isActive: true
      })
    }

    return {
      isSuccess: true,
      message: "Payable template saved successfully",
      payableTemplateId
    }
  } catch (error) {
    console.error("Error saving payable template:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to save payable template"
    }
  }
}

/**
 * Save tenant and lease to database (Step 4)
 */
export async function saveTenantStep(
  tenant: TenantState,
  propertyId: string,
  billTemplateIdMap: Record<number, string> // Map wizard index to actual bill template ID
): Promise<{
  isSuccess: boolean
  message: string
  tenantId?: string
  leaseAgreementId?: string
  rentalInvoiceTemplateId?: string
}> {
  try {
    const displayData = tenant.extractedData || tenant.manualData

    if (!displayData || !displayData.name || !displayData.idNumber) {
      return { isSuccess: false, message: "Missing required tenant data" }
    }

    // Create tenant
    const tenantResult = await createTenantAction({
      propertyId,
      name: displayData.name,
      idNumber: displayData.idNumber,
      email: displayData.email || null,
      phone: displayData.phone || null,
      rentalAmount: displayData.rentalAmount ? String(displayData.rentalAmount) : null,
      leaseStartDate: displayData.startDate ? new Date(displayData.startDate) : null,
      leaseEndDate: displayData.endDate ? new Date(displayData.endDate) : null
    })

    if (!tenantResult.isSuccess || !tenantResult.data) {
      return { isSuccess: false, message: "Failed to create tenant" }
    }

    const tenantId = tenantResult.data.id

    // Upload lease if available (file should be uploaded from client first)
    // For now, create lease record with dates - file can be uploaded later through tenant detail page
    let leaseAgreementId: string | undefined
    if (displayData.startDate && displayData.endDate) {
      // Create lease record without file (file can be uploaded later)
      try {
        const { db } = await import("@/db")
        const { leaseAgreementsTable } = await import("@/db/schema")
        const startDate = new Date(displayData.startDate)
        const endDate = new Date(displayData.endDate)

        const [lease] = await db
          .insert(leaseAgreementsTable)
          .values({
            tenantId,
            propertyId,
            fileName: "lease.pdf",
            fileUrl: "",
            extractedStartDate: startDate,
            extractedEndDate: endDate,
            manualStartDate: null,
            manualEndDate: null,
            effectiveStartDate: startDate,
            effectiveEndDate: endDate,
            extractionData: tenant.extractedData ? (tenant.extractedData as unknown as Record<string, unknown>) : null,
            status: tenant.extractedData ? "processed" : "pending"
          })
          .returning()

        if (lease) {
          leaseAgreementId = lease.id
        }
      } catch (leaseError) {
        console.error("Error creating lease record:", leaseError)
        // Continue without lease
      }
    }

    // Create ONE rental invoice template
    let rentalInvoiceTemplateId: string | undefined
    if (tenant.rentalInvoiceTemplate) {
      // Convert temp bill template IDs to actual IDs
      const actualBillTemplateIds: string[] = []
      for (const tempId of tenant.rentalInvoiceTemplate.dependsOnBillTemplateIds) {
        if (tempId.startsWith("temp-")) {
          const billIndex = parseInt(tempId.replace("temp-", ""))
          const actualId = billTemplateIdMap[billIndex]
          if (actualId) {
            actualBillTemplateIds.push(actualId)
          }
        } else {
          // Already an actual ID
          actualBillTemplateIds.push(tempId)
        }
      }

      if (actualBillTemplateIds.length > 0) {
        const invoiceTemplateResult = await createRentalInvoiceTemplateAction({
          propertyId,
          tenantId,
          name: tenant.rentalInvoiceTemplate.name || `${displayData.name} Rental Invoice`,
          description: tenant.rentalInvoiceTemplate.description || null,
          dependsOnBillTemplateIds: actualBillTemplateIds,
          generationDayOfMonth: tenant.rentalInvoiceTemplate.generationDayOfMonth || 5,
          isActive: true
        })

        if (invoiceTemplateResult.isSuccess && invoiceTemplateResult.data) {
          rentalInvoiceTemplateId = invoiceTemplateResult.data.id
        }
      }
    } else {
      // Auto-create ONE rental invoice template for all bill templates with invoice extraction
      // if user didn't explicitly configure one
      const { autoCreateRentalInvoiceTemplateForTenantAction } = await import(
        "@/actions/rental-invoice-templates-actions"
      )
      const autoCreateResult = await autoCreateRentalInvoiceTemplateForTenantAction(
        tenantId,
        propertyId,
        5, // Default generation day
        displayData.name
      )
      if (autoCreateResult.isSuccess && autoCreateResult.data) {
        rentalInvoiceTemplateId = autoCreateResult.data.id
      }
    }

    // Generate invoice periods from lease dates
    if (displayData.startDate && displayData.endDate) {
      try {
        const startDate = new Date(displayData.startDate)
        const endDate = new Date(displayData.endDate)

        await generateInvoicePeriodsForLeaseAction(
          propertyId,
          tenantId,
          leaseAgreementId || undefined,
          startDate,
          endDate
        )
      } catch (periodError) {
        console.error("Error generating invoice periods:", periodError)
        // Continue - periods can be generated later
      }
    }

    return {
      isSuccess: true,
      message: "Tenant saved successfully",
      tenantId,
      leaseAgreementId,
      rentalInvoiceTemplateId
    }
  } catch (error) {
    console.error("Error saving tenant:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to save tenant"
    }
  }
}

