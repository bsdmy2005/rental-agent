"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { WizardProgress } from "./wizard-progress"
import { WizardStep } from "./wizard-step"
import { useWizardState } from "./wizard-state"
import { PropertyDetailsStep } from "./steps/property-details-step"
import { BillTemplatesStep } from "./steps/bill-templates-step"
import { PayableTemplatesStep } from "./steps/payable-templates-step"
import { TenantsStep } from "./steps/tenants-step"
import { ReviewStep } from "./steps/review-step"
import { completeOnboarding } from "./wizard-completion"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight } from "lucide-react"

const STEP_LABELS = ["Property", "Bill Templates", "Payables", "Tenants", "Review"]
const TOTAL_STEPS = 5

export function PropertyOnboardingWizard({ landlordId }: { landlordId: string }) {
  const router = useRouter()
  const { state, reset, setPropertyId, updatePayableTemplates, updateTenants } = useWizardState()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const canProceedToStep2 = !!(
    state.property.name &&
    state.property.streetAddress &&
    state.property.suburb &&
    state.property.province
  )

  const canProceedToStep3 = state.billTemplates.length > 0 && state.billTemplates.every((t) => t.name.trim() && t.billTemplateId)

  const canProceedToStep4 = true // Payables are optional

  const canProceedToStep5 = state.tenants.length > 0 && state.tenants.every((t) => {
    const hasData = t.extractedData || t.manualData
    return hasData && (t.extractedData?.name || t.manualData?.name) && t.tenantId
  })

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setLoading(true)
      try {
        // Step 1 -> Step 2: Save property
        if (currentStep === 1 && !state.property.propertyId) {
          const { savePropertyStep } = await import("./wizard-step-actions")
          const result = await savePropertyStep(state.property, landlordId)
          if (result.isSuccess && result.propertyId) {
            setPropertyId(result.propertyId)
            toast.success("Property saved successfully!")
            setCurrentStep(2)
          } else {
            toast.error(result.message || "Failed to save property")
            return
          }
        }
        // Step 3 -> Step 4: Save payable templates
        else if (currentStep === 3 && state.property.propertyId) {
          const { savePayableTemplateStep } = await import("./wizard-step-actions")
          
          // Build bill template ID map
          const billTemplateIdMap: Record<number, string> = {}
          state.billTemplates.forEach((template, index) => {
            if (template.billTemplateId) {
              billTemplateIdMap[index] = template.billTemplateId
            }
          })

          // Save all payable templates that aren't saved yet
          const updatedPayables = [...state.payableTemplates]
          let allSaved = true
          for (let i = 0; i < updatedPayables.length; i++) {
            const template = updatedPayables[i]
            if (!template.payableTemplateId && template.name.trim()) {
              const result = await savePayableTemplateStep(template, state.property.propertyId!, billTemplateIdMap)
              if (result.isSuccess && result.payableTemplateId) {
                updatedPayables[i] = { ...template, payableTemplateId: result.payableTemplateId }
              } else {
                allSaved = false
                toast.error(`Failed to save payable template "${template.name}": ${result.message}`)
              }
            }
          }
          
          if (allSaved) {
            updatePayableTemplates(updatedPayables)
            setCurrentStep(4)
          }
        }
        // Step 4 -> Step 5: Save tenants
        else if (currentStep === 4 && state.property.propertyId) {
          const { saveTenantStep } = await import("./wizard-step-actions")
          
          // Build bill template ID map
          const billTemplateIdMap: Record<number, string> = {}
          state.billTemplates.forEach((template, index) => {
            if (template.billTemplateId) {
              billTemplateIdMap[index] = template.billTemplateId
            }
          })

          // Save all tenants that aren't saved yet
          const updatedTenants = [...state.tenants]
          let allSaved = true
          for (let i = 0; i < updatedTenants.length; i++) {
            const tenant = updatedTenants[i]
            if (!tenant.tenantId) {
              const displayData = tenant.extractedData || tenant.manualData
              if (displayData && displayData.name && displayData.idNumber) {
                const result = await saveTenantStep(tenant, state.property.propertyId!, billTemplateIdMap)
                if (result.isSuccess) {
                  updatedTenants[i] = {
                    ...tenant,
                    tenantId: result.tenantId,
                    leaseAgreementId: result.leaseAgreementId,
                    rentalInvoiceTemplate: tenant.rentalInvoiceTemplate
                      ? {
                          ...tenant.rentalInvoiceTemplate,
                          rentalInvoiceTemplateId: result.rentalInvoiceTemplateId
                        }
                      : undefined
                  }
                } else {
                  allSaved = false
                  toast.error(`Failed to save tenant "${displayData.name}": ${result.message}`)
                }
              }
            }
          }
          
          if (allSaved) {
            updateTenants(updatedTenants)
            setCurrentStep(5)
          }
        } else {
          setCurrentStep(currentStep + 1)
        }
      } catch (error) {
        console.error("Error saving step:", error)
        toast.error("An error occurred while saving")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // At this point, everything should already be saved
      // Just redirect to the property page
      if (state.property.propertyId) {
        toast.success("Property onboarding completed successfully!")
        reset()
        router.push(`/dashboard/properties/${state.property.propertyId}`)
      } else {
        toast.error("Property not found. Please start over.")
      }
    } catch (error) {
      console.error("Error completing onboarding:", error)
      toast.error("An error occurred while completing onboarding")
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return canProceedToStep2
      case 2:
        return canProceedToStep3
      case 3:
        return canProceedToStep4
      case 4:
        return canProceedToStep5
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} stepLabels={STEP_LABELS} />

      {currentStep === 1 && (
        <PropertyDetailsStep />
      )}

      {currentStep === 2 && (
        <BillTemplatesStep />
      )}

      {currentStep === 3 && (
        <PayableTemplatesStep />
      )}

      {currentStep === 4 && (
        <TenantsStep />
      )}

      {currentStep === 5 && (
        <ReviewStep />
      )}

      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={!canProceed() || loading}
          >
            {loading ? "Completing..." : "Complete Onboarding"}
          </Button>
        )}
      </div>
    </div>
  )
}

