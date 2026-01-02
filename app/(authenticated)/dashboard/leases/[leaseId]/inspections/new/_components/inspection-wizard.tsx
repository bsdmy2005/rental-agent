"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"
import { InspectorAssignmentStep, InspectorInfo } from "./inspector-assignment-step"
import { ComponentConfigurationStep } from "./component-configuration-step"
import { PrePopulatedItemsStep } from "./pre-populated-items-step"
import { ReviewStep } from "./review-step"
import { ComponentConfiguration } from "@/actions/moving-inspections-actions"
import { assignInspectorToInspectionAction } from "@/actions/moving-inspections-actions"
import { toast } from "sonner"

interface EditableRoom {
  id: string
  categoryName: string
  categoryId?: string
  roomInstanceNumber?: number
  isInstance?: boolean
  isCustom?: boolean
  items: Array<{
    id: string
    name: string
    displayOrder: number
    isCustom?: boolean
  }>
}

interface InspectionWizardProps {
  leaseId: string
  tenant: {
    id: string
    name: string
  } | null
  property: {
    id: string
    name: string
  } | null
}

export function InspectionWizard({ leaseId, tenant, property }: InspectionWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [inspectorType, setInspectorType] = useState<"direct" | "third_party" | null>(null)
  const [inspectorInfo, setInspectorInfo] = useState<InspectorInfo | null>(null)
  const [componentConfig, setComponentConfig] = useState<ComponentConfiguration>({})
  const [prePopulatedItems, setPrePopulatedItems] = useState<Array<{
    categoryName: string
    items: Array<{ name: string; displayOrder: number; roomInstanceNumber?: number }>
  }>>([])
  const [finalRooms, setFinalRooms] = useState<EditableRoom[]>([])

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStep1Complete = (type: "direct" | "third_party", info?: InspectorInfo) => {
    setInspectorType(type)
    if (info) {
      setInspectorInfo(info)
    }
    setCurrentStep(2)
  }

  const handleStep2Complete = (config: ComponentConfiguration, items: Array<{
    categoryName: string
    items: Array<{ name: string; displayOrder: number; roomInstanceNumber?: number }>
  }>) => {
    setComponentConfig(config)
    setPrePopulatedItems(items)
    setCurrentStep(3)
  }

  const handleStep3Complete = (rooms: EditableRoom[]) => {
    setFinalRooms(rooms)
    setCurrentStep(4)
  }

  const handleStep4Complete = async () => {
    try {
      const { initializeInspectionFromRoomsAction, lockInspectionStructureAction } = await import("@/actions/moving-inspections-actions")
      
      // Create inspection from final rooms
      const result = await initializeInspectionFromRoomsAction(
        leaseId,
        finalRooms
      )

      if (!result.isSuccess || !result.data) {
        toast.error(result.message)
        return
      }

      // Lock structure
      const lockResult = await lockInspectionStructureAction(result.data.id)
      if (!lockResult.isSuccess) {
        toast.error(lockResult.message)
        return
      }

      // If third-party inspector was selected, assign them now
      if (inspectorType === "third_party" && inspectorInfo) {
        const assignResult = await assignInspectorToInspectionAction(result.data.id, {
          name: inspectorInfo.name,
          email: inspectorInfo.email,
          company: inspectorInfo.company,
          phone: inspectorInfo.phone
        })
        
        if (assignResult.isSuccess) {
          toast.success("Inspection created and assigned to third-party inspector. They will receive an email with access.")
        } else {
          toast.warning("Inspection created, but failed to assign inspector. You can assign them manually from the inspection detail page.")
        }
      } else {
        toast.success("Inspection created successfully")
      }

      router.push(`/dashboard/moving-inspections/${result.data.id}`)
    } catch (error) {
      console.error("Error creating inspection:", error)
      toast.error("Failed to create inspection")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/leases/${leaseId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lease
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Moving-In Inspection</CardTitle>
          <CardDescription>
            Configure the inspection form for {property?.name || "this property"}
            {tenant && ` - Tenant: ${tenant.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      step === currentStep
                        ? "bg-primary text-primary-foreground border-primary"
                        : step < currentStep
                        ? "bg-green-500 text-white border-green-500"
                        : "bg-muted text-muted-foreground border-muted-foreground"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step < currentStep ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">
              {currentStep === 1 && (
                <InspectorAssignmentStep
                  onComplete={handleStep1Complete}
                />
              )}
              {currentStep === 2 && (
                <ComponentConfigurationStep
                  onComplete={handleStep2Complete}
                  initialConfig={componentConfig}
                />
              )}
              {currentStep === 3 && (
                <PrePopulatedItemsStep
                  items={prePopulatedItems}
                  onComplete={handleStep3Complete}
                  onBack={handleBack}
                />
              )}
              {currentStep === 4 && (
                <ReviewStep
                  componentConfig={componentConfig}
                  finalRooms={finalRooms}
                  onComplete={handleStep4Complete}
                  onBack={handleBack}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

