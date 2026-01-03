"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, CheckCircle2 } from "lucide-react"
import { PropertyIdentificationStep } from "./property-identification-step"
import { IncidentDetailsStep } from "./incident-details-step"
import { ContactInfoStep } from "./contact-info-step"
import { IncidentSubmissionConfirmation } from "./incident-submission-confirmation"

interface SubmissionData {
  propertyId?: string
  propertyName?: string
  tenantId?: string
  tenantName?: string
  title?: string
  description?: string
  priority?: "low" | "medium" | "high" | "urgent"
  submittedName?: string
  submittedPhone?: string
  files?: File[]
}

export function PublicIncidentSubmissionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submissionData, setSubmissionData] = useState<SubmissionData>({})
  const [submittedIncidentId, setSubmittedIncidentId] = useState<string | null>(null)
  const [autoIdentifying, setAutoIdentifying] = useState(false)

  // Auto-identify property if code is provided in URL
  useEffect(() => {
    const code = searchParams.get("code")
    if (code && !submissionData.propertyId) {
      setAutoIdentifying(true)
      fetch("/api/properties/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "code", value: code.toUpperCase() })
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setSubmissionData({
              propertyId: result.data.propertyId,
              propertyName: result.data.propertyName
            })
            setCurrentStep(2) // Skip to incident details step
          }
        })
        .catch((error) => {
          console.error("Error auto-identifying property:", error)
        })
        .finally(() => {
          setAutoIdentifying(false)
        })
    }
  }, [searchParams, submissionData.propertyId])

  const handlePropertyIdentified = (data: {
    propertyId: string
    propertyName: string
    tenantId?: string
    tenantName?: string
  }) => {
    setSubmissionData((prev) => ({
      ...prev,
      propertyId: data.propertyId,
      propertyName: data.propertyName,
      tenantId: data.tenantId,
      tenantName: data.tenantName
    }))
    setCurrentStep(2)
  }

  const handleIncidentDetailsComplete = (data: {
    title: string
    description: string
    priority: "low" | "medium" | "high" | "urgent"
    files?: File[]
  }) => {
    setSubmissionData((prev) => ({
      ...prev,
      ...data
    }))
    setCurrentStep(3)
  }

  const handleContactInfoComplete = (data: {
    submittedName?: string
    submittedPhone?: string
  }) => {
    setSubmissionData((prev) => ({
      ...prev,
      ...data
    }))
    setCurrentStep(4)
  }

  const handleSubmit = async () => {
    if (!submissionData.propertyId || !submissionData.title || !submissionData.description) {
      toast.error("Please complete all required fields")
      return
    }

    setSubmitting(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("propertyId", submissionData.propertyId)
      formDataToSend.append("title", submissionData.title)
      formDataToSend.append("description", submissionData.description)
      formDataToSend.append("priority", submissionData.priority || "medium")
      
      if (submissionData.submittedName) {
        formDataToSend.append("submittedName", submissionData.submittedName)
      }
      if (submissionData.submittedPhone) {
        formDataToSend.append("submittedPhone", submissionData.submittedPhone)
      }
      if (submissionData.tenantId) {
        formDataToSend.append("tenantId", submissionData.tenantId)
      }

      // Add files
      if (submissionData.files) {
        submissionData.files.forEach((file) => {
          formDataToSend.append("files", file)
        })
      }

      const response = await fetch("/api/incidents/public/submit", {
        method: "POST",
        body: formDataToSend
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit incident")
      }

      setSubmittedIncidentId(result.data.incidentId)
      toast.success("Incident submitted successfully!")
    } catch (error) {
      console.error("Error submitting incident:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit incident")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedIncidentId) {
    return (
      <IncidentSubmissionConfirmation
        incidentId={submittedIncidentId}
        referenceNumber={`INC-${submittedIncidentId.slice(0, 8).toUpperCase()}`}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report an Issue</CardTitle>
        <CardDescription>
          Step {currentStep} of 4: {getStepTitle(currentStep)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step === currentStep
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span>{step}</span>
                )}
              </div>
              {step < 4 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    step < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {currentStep === 1 && (
          <>
            {autoIdentifying && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Identifying property...</span>
              </div>
            )}
            {!autoIdentifying && (
              <PropertyIdentificationStep onComplete={handlePropertyIdentified} />
            )}
          </>
        )}
        {currentStep === 2 && (
          <IncidentDetailsStep
            onComplete={handleIncidentDetailsComplete}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 3 && (
          <ContactInfoStep
            onComplete={handleContactInfoComplete}
            onBack={() => setCurrentStep(2)}
            defaultName={submissionData.tenantName}
            defaultPhone={submissionData.submittedPhone}
          />
        )}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold">Review Your Submission</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Property:</span> {submissionData.propertyName}
                </p>
                <p>
                  <span className="font-medium">Title:</span> {submissionData.title}
                </p>
                <p>
                  <span className="font-medium">Priority:</span>{" "}
                  {submissionData.priority
                    ? submissionData.priority.charAt(0).toUpperCase() + submissionData.priority.slice(1)
                    : "Not specified"}
                </p>
                {submissionData.submittedName && (
                  <p>
                    <span className="font-medium">Your Name:</span> {submissionData.submittedName}
                  </p>
                )}
                {submissionData.submittedPhone && (
                  <p>
                    <span className="font-medium">Phone:</span> {submissionData.submittedPhone}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={submitting}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Incident
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return "Identify Property"
    case 2:
      return "Incident Details"
    case 3:
      return "Contact Information"
    case 4:
      return "Confirmation"
    default:
      return ""
  }
}

