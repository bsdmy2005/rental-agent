"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { validateRfqCodeAction } from "@/actions/rfq-codes-actions"
import { submitQuoteByCodeAction, getRfqDetailsByCodeAction } from "@/actions/service-providers-actions"
import { toast } from "sonner"
import { Loader2, Upload, Building2, MapPin, FileText } from "lucide-react"

interface RfqDetails {
  rfq: {
    id: string
    title: string | null
    description: string | null
    notes: string | null
    dueDate: Date | null
  }
  property: {
    id: string
    name: string
    streetAddress: string
    suburb: string
    province: string
  } | null
  incident: {
    id: string
    title: string
    description: string | null
    priority: string | null
  } | null
}

function SubmitQuotePageContent() {
  const params = useParams()
  const code = params.code as string

  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [rfqDetails, setRfqDetails] = useState<RfqDetails | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    estimatedCompletionDate: "",
    pdfFile: null as File | null
  })

  useEffect(() => {
    async function validateCode() {
      if (!code) {
        setValidating(false)
        setValid(false)
        return
      }

      try {
        const result = await validateRfqCodeAction(code)
        if (result.isSuccess && result.data) {
          setValid(true)
          // Fetch RFQ details
          const detailsResult = await getRfqDetailsByCodeAction(code)
          if (detailsResult.isSuccess && detailsResult.data) {
            setRfqDetails(detailsResult.data)
          }
        } else {
          setValid(false)
          toast.error(result.message || "Invalid RFQ code")
        }
      } catch (error) {
        console.error("Error validating code:", error)
        setValid(false)
        toast.error("Failed to validate RFQ code")
      } finally {
        setValidating(false)
      }
    }

    validateCode()
  }, [code])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setFormData({ ...formData, pdfFile: file })
      } else {
        toast.error("Please upload a PDF file")
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.amount) {
      toast.error("Amount is required")
      return
    }

    setSubmitting(true)
    try {
      // Convert PDF to buffer if provided
      let pdfBuffer: Buffer | undefined
      if (formData.pdfFile) {
        const arrayBuffer = await formData.pdfFile.arrayBuffer()
        pdfBuffer = Buffer.from(arrayBuffer)
      }

      const result = await submitQuoteByCodeAction(code, {
        amount: formData.amount,
        description: formData.description || undefined,
        estimatedCompletionDate: formData.estimatedCompletionDate
          ? new Date(formData.estimatedCompletionDate)
          : undefined,
        pdfBuffer,
        fileName: formData.pdfFile?.name
      })

      if (result.isSuccess) {
        toast.success("Quote submitted successfully!")
        // Reset form
        setFormData({
          amount: "",
          description: "",
          estimatedCompletionDate: "",
          pdfFile: null
        })
        // Optionally redirect or show success message
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error submitting quote:", error)
      toast.error("Failed to submit quote")
    } finally {
      setSubmitting(false)
    }
  }

  if (validating) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Validating RFQ code...</span>
        </div>
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invalid RFQ Code</CardTitle>
            <CardDescription>
              The RFQ code you provided is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      {/* RFQ Summary Section */}
      {rfqDetails && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request for Quote Details
            </CardTitle>
            <CardDescription>RFQ Code: {code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rfqDetails.rfq.title && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Title</p>
                <p className="text-lg font-semibold">{rfqDetails.rfq.title}</p>
              </div>
            )}

            {rfqDetails.property && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Property
                </p>
                <p className="text-base font-medium">{rfqDetails.property.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {rfqDetails.property.streetAddress}, {rfqDetails.property.suburb}, {rfqDetails.property.province}
                </p>
              </div>
            )}

            {rfqDetails.incident && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Linked Incident</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium">{rfqDetails.incident.title}</p>
                  {rfqDetails.incident.priority && (
                    <Badge variant="outline">
                      {rfqDetails.incident.priority}
                    </Badge>
                  )}
                </div>
                {rfqDetails.incident.description && (
                  <p className="text-sm text-muted-foreground mt-1">{rfqDetails.incident.description}</p>
                )}
              </div>
            )}

            {rfqDetails.rfq.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{rfqDetails.rfq.description}</p>
              </div>
            )}

            {rfqDetails.rfq.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</p>
                <p className="text-sm whitespace-pre-wrap">{rfqDetails.rfq.notes}</p>
              </div>
            )}

            {rfqDetails.rfq.dueDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Due Date</p>
                <p className="text-sm">
                  {new Date(rfqDetails.rfq.dueDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Your Quote</CardTitle>
          <CardDescription>
            Please provide your quote details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="amount">
                Quote Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="text"
                placeholder="e.g., R 1,500.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description of Work</Label>
              <Textarea
                id="description"
                placeholder="Describe the work to be performed..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
              />
            </div>

            <div>
              <Label htmlFor="estimatedCompletionDate">Estimated Completion Date</Label>
              <Input
                id="estimatedCompletionDate"
                type="date"
                value={formData.estimatedCompletionDate}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedCompletionDate: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="pdf">Upload Quote PDF (Optional)</Label>
              <div className="mt-2">
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                {formData.pdfFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {formData.pdfFile.name}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Quote
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SubmitQuotePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-12 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <SubmitQuotePageContent />
    </Suspense>
  )
}

