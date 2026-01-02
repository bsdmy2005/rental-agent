"use server"

import { ActionState } from "@/types"
import type { WizardState } from "./wizard-state"

/**
 * Complete onboarding - at this point, all resources should already be saved
 * This function just verifies everything is saved and returns the property ID
 */
export async function completeOnboarding(
  wizardState: WizardState,
  landlordId: string
): Promise<ActionState<string>> {
  try {
    // Verify property is saved
    if (!wizardState.property.propertyId) {
      return { isSuccess: false, message: "Property not saved. Please complete Step 1." }
    }

    // Verify all bill templates are saved
    const unsavedBillTemplates = wizardState.billTemplates.filter((t) => !t.billTemplateId)
    if (unsavedBillTemplates.length > 0) {
      return {
        isSuccess: false,
        message: `Please save all bill templates. ${unsavedBillTemplates.length} template(s) not saved.`
      }
    }

    // Verify all tenants are saved
    const unsavedTenants = wizardState.tenants.filter((t) => !t.tenantId)
    if (unsavedTenants.length > 0) {
      return {
        isSuccess: false,
        message: `Please save all tenants. ${unsavedTenants.length} tenant(s) not saved.`
      }
    }

    console.log("[Wizard Completion] ✓ All resources already saved, onboarding complete!")
    return {
      isSuccess: true,
      message: "Property onboarding completed successfully",
      data: wizardState.property.propertyId
    }

    // Step 2: Create bill templates + rules + schedules
    console.log("[Wizard Completion] Step 2: Creating bill templates and rules...")
    const billTemplateIdMap: Record<number, string> = {} // Map wizard index to actual template ID

    for (let i = 0; i < wizardState.billTemplates.length; i++) {
      const template = wizardState.billTemplates[i]

      // Create extraction rule if needed
      let ruleId: string | null = null
      if (template.newRule) {
        console.log(`[Wizard Completion] Creating extraction rule for bill template ${i + 1}...`)
        
        // Convert field mappings to extraction configs
        const convertMappingsToConfig = (mappings: any[]): Record<string, unknown> => {
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

        const invoiceExtractionConfig = template.newRule.extractForInvoice && template.newRule.invoiceFieldMappings.length > 0
          ? convertMappingsToConfig(template.newRule.invoiceFieldMappings)
          : undefined

        const paymentExtractionConfig = template.newRule.extractForPayment && template.newRule.paymentFieldMappings.length > 0
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
          console.error(`[Wizard Completion] Failed to create rule for template ${i + 1}`)
          // Continue without rule - template can be created without rule
        } else {
          ruleId = ruleResult.data.id
          console.log(`[Wizard Completion] ✓ Rule created: ${ruleId}`)
        }
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
        console.error(`[Wizard Completion] Failed to create bill template ${i + 1}`)
        continue
      }

      const billTemplateId = billTemplateResult.data.id
      billTemplateIdMap[i] = billTemplateId
      console.log(`[Wizard Completion] ✓ Bill template created: ${billTemplateId}`)

      // Create arrival schedule if day specified
      if (template.expectedDayOfMonth) {
        const scheduleResult = await createBillArrivalScheduleAction({
          billTemplateId,
          propertyId,
          expectedDayOfMonth: template.expectedDayOfMonth,
          isActive: true
        })

        if (scheduleResult.isSuccess) {
          console.log(`[Wizard Completion] ✓ Arrival schedule created for bill template ${billTemplateId}`)
        }
      }
    }

    // Step 3: Create payable templates + schedules
    console.log("[Wizard Completion] Step 3: Creating payable templates...")
    const payableTemplateIdMap: Record<number, string> = {}

    for (let i = 0; i < wizardState.payableTemplates.length; i++) {
      const template = wizardState.payableTemplates[i]

      // Map temporary bill template IDs to actual IDs
      const dependsOnBillTemplateIds = (template.dependsOnBillTemplateIds || []).map((tempId) => {
        const billIndex = parseInt(tempId.replace("temp-", ""))
        return billTemplateIdMap[billIndex]
      }).filter(Boolean) as string[]

      const payableTemplateResult = await createPayableTemplateAction({
        propertyId,
        name: template.name,
        dependsOnBillTemplateIds,
        isActive: true
      })

      if (!payableTemplateResult.isSuccess || !payableTemplateResult.data) {
        console.error(`[Wizard Completion] Failed to create payable template ${i + 1}`)
        continue
      }

      const payableTemplateId = payableTemplateResult.data.id
      payableTemplateIdMap[i] = payableTemplateId
      console.log(`[Wizard Completion] ✓ Payable template created: ${payableTemplateId}`)

      // Create payable schedule if day specified
      if (template.scheduledDayOfMonth) {
        const scheduleResult = await createPayableScheduleAction({
          payableTemplateId,
          propertyId,
          scheduledDayOfMonth: template.scheduledDayOfMonth,
          isActive: true
        })

        if (scheduleResult.isSuccess) {
          console.log(`[Wizard Completion] ✓ Payable schedule created for payable template ${payableTemplateId}`)
        }
      }
    }

    // Step 4: Create tenants + leases + rental invoice templates
    console.log("[Wizard Completion] Step 4: Creating tenants and leases...")
    const tenantIdMap: Record<number, string> = {}
    const leaseIdMap: Record<number, string> = {}

    for (let i = 0; i < wizardState.tenants.length; i++) {
      const tenant = wizardState.tenants[i]
      const displayData = tenant.extractedData || tenant.manualData

      if (!displayData || !displayData.name || !displayData.idNumber) {
        console.error(`[Wizard Completion] Skipping tenant ${i + 1} - missing required data`)
        continue
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
        console.error(`[Wizard Completion] Failed to create tenant ${i + 1}`)
        continue
      }

      const tenantId = tenantResult.data.id
      tenantIdMap[i] = tenantId
      console.log(`[Wizard Completion] ✓ Tenant created: ${tenantId}`)

      // Upload lease if available (file data passed as base64)
      // Note: File objects are client-side only, so we'll handle lease uploads separately
      // For now, if extracted data has dates, we'll create a lease record without the file
      // The file can be uploaded later through the tenant detail page
      if (displayData.startDate && displayData.endDate) {
        try {
          // Create a minimal lease record with dates
          // The actual PDF can be uploaded later through the tenant detail page
          const { db } = await import("@/db")
          const { leaseAgreementsTable } = await import("@/db/schema")
          const startDate = new Date(displayData.startDate)
          const endDate = new Date(displayData.endDate)

          const [lease] = await db
            .insert(leaseAgreementsTable)
            .values({
              tenantId,
              propertyId,
              fileName: "lease.pdf", // Placeholder
              fileUrl: "", // Will be updated when file is uploaded
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
            leaseIdMap[i] = lease.id
            console.log(`[Wizard Completion] ✓ Lease record created: ${lease.id}`)
          }
        } catch (leaseError) {
          console.error(`[Wizard Completion] Error creating lease record for tenant ${i + 1}:`, leaseError)
          // Continue without lease
        }
      }

      // Create ONE rental invoice template
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
            fixedLineItems: tenant.rentalInvoiceTemplate.fixedLineItems || undefined,
            isActive: true
          })

          if (invoiceTemplateResult.isSuccess) {
            console.log(`[Wizard Completion] ✓ Rental invoice template created for tenant ${tenantId}`)
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
          console.log(`[Wizard Completion] ✓ Auto-created rental invoice template for tenant ${tenantId}`)
        }
      }

      // Generate invoice periods from lease dates
      if (displayData.startDate && displayData.endDate) {
        try {
          const leaseId = leaseIdMap[i] || null
          const startDate = new Date(displayData.startDate)
          const endDate = new Date(displayData.endDate)

          await generateInvoicePeriodsForLeaseAction(
            propertyId,
            tenantId,
            leaseId || undefined,
            startDate,
            endDate
          )
          console.log(`[Wizard Completion] ✓ Invoice periods generated for tenant ${tenantId}`)
        } catch (periodError) {
          console.error(`[Wizard Completion] Error generating invoice periods:`, periodError)
          // Continue - periods can be generated later
        }
      }
    }

    console.log("[Wizard Completion] ✓ Onboarding completed successfully!")
    return {
      isSuccess: true,
      message: "Property onboarding completed successfully",
      data: propertyId
    }
  } catch (error) {
    console.error("[Wizard Completion] Error completing onboarding:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to complete onboarding"
    }
  }
}

