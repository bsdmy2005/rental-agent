"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createExtractionRuleAction, updateExtractionRuleAction } from "@/actions/extraction-rules-actions"
import { toast } from "sonner"
import { FieldMappingBuilder, type FieldMapping } from "./field-mapping-builder"
import { Info, CheckCircle2, FileText, Settings, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ModernRuleBuilderProps {
  userProfileId: string
  properties: Array<{ id: string; name: string }>
  onSuccess?: () => void
  initialRule?: { id: string }
  initialFormData?: {
    propertyId: string
    name: string
    extractForInvoice: boolean
    extractForPayment: boolean
    billType: string
    channel: string
    emailFilterFrom: string
    emailFilterSubject: string
    invoiceFieldMappings: FieldMapping[]
    paymentFieldMappings: FieldMapping[]
    invoiceInstruction: string
    paymentInstruction: string
  }
}

export function ModernRuleBuilder({
  userProfileId,
  properties,
  onSuccess,
  initialRule,
  initialFormData
}: ModernRuleBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState(
    initialFormData || {
      propertyId: "",
      name: "",
      extractForInvoice: false,
      extractForPayment: false,
      billType: "",
      channel: "",
      emailFilterFrom: "",
      emailFilterSubject: "",
      invoiceFieldMappings: [] as FieldMapping[],
      paymentFieldMappings: [] as FieldMapping[],
      invoiceInstruction: "",
      paymentInstruction: ""
    }
  )

  // Reset to step 3 if channel changes and we're on step 4
  useEffect(() => {
    if (currentStep === 4 && formData.channel !== "email_forward") {
      setCurrentStep(3)
    }
  }, [formData.channel, currentStep])

  // Auto-suggest field mappings based on bill type
  useEffect(() => {
    if (formData.billType && formData.extractForInvoice && formData.invoiceFieldMappings.length === 0) {
      const suggestions: FieldMapping[] = []
      
      if (formData.billType === "municipality") {
        suggestions.push(
          {
            id: "1",
            type: "water",
            label: "Water Charges",
            patterns: ["water", "water charges", "water usage"],
            extractUsage: true
          },
          {
            id: "2",
            type: "electricity",
            label: "Electricity",
            patterns: ["electricity", "power", "energy"],
            extractUsage: true
          },
          {
            id: "3",
            type: "sewerage",
            label: "Sewerage",
            patterns: ["sewerage", "sewer", "sanitation"]
          }
        )
      } else if (formData.billType === "levy") {
        suggestions.push(
          {
            id: "1",
            type: "water",
            label: "Water Charges",
            patterns: ["water", "water charges"],
            extractUsage: true
          },
          {
            id: "2",
            type: "electricity",
            label: "Electricity",
            patterns: ["electricity", "power"],
            extractUsage: true
          }
        )
      } else if (formData.billType === "utility") {
        suggestions.push(
          {
            id: "1",
            type: "water",
            label: "Water Charges",
            patterns: ["water", "water charges", "water usage"],
            extractUsage: true
          },
          {
            id: "2",
            type: "electricity",
            label: "Electricity",
            patterns: ["electricity", "power", "energy", "kwh"],
            extractUsage: true
          }
        )
      }

      if (suggestions.length > 0) {
        setFormData((prev) => ({ ...prev, invoiceFieldMappings: suggestions }))
        toast.info("We've suggested some common field mappings based on your bill type. You can modify or add more.")
      }
    }

    if (formData.billType && formData.extractForPayment && formData.paymentFieldMappings.length === 0) {
      const suggestions: FieldMapping[] = []
      
      if (formData.billType === "municipality") {
        suggestions.push({
          id: "1",
          type: "municipality",
          label: "Municipality Charges",
          patterns: ["municipality", "city council", "municipal", "rates"],
          extractBeneficiary: true,
          extractAccountNumber: true
        })
      } else if (formData.billType === "levy") {
        suggestions.push({
          id: "1",
          type: "levy",
          label: "Body Corporate Levy",
          patterns: ["levy", "body corporate", "bc levy"],
          extractBeneficiary: true,
          extractAccountNumber: true
        })
      }

      if (suggestions.length > 0) {
        setFormData((prev) => ({ ...prev, paymentFieldMappings: suggestions }))
        toast.info("We've suggested some common field mappings based on your bill type. You can modify or add more.")
      }
    }
  }, [formData.billType, formData.extractForInvoice, formData.extractForPayment])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate at least one output type is selected
      if (!formData.extractForInvoice && !formData.extractForPayment) {
        toast.error("Please select at least one output type (Invoice or Payment)")
        setCurrentStep(2)
        setLoading(false)
        return
      }

      // Validate property is selected
      if (!formData.propertyId) {
        toast.error("Please select a property")
        setCurrentStep(1)
        setLoading(false)
        return
      }

      // Validate field mappings
      if (formData.extractForInvoice && formData.invoiceFieldMappings.length === 0) {
        toast.error("Please add at least one field mapping for invoice extraction")
        setCurrentStep(3)
        setLoading(false)
        return
      }

      if (formData.extractForPayment && formData.paymentFieldMappings.length === 0) {
        toast.error("Please add at least one field mapping for payment extraction")
        setCurrentStep(3)
        setLoading(false)
        return
      }

      // Convert field mappings to JSON config
      const invoiceExtractionConfig = formData.extractForInvoice
        ? convertMappingsToConfig(formData.invoiceFieldMappings)
        : undefined

      const paymentExtractionConfig = formData.extractForPayment
        ? convertMappingsToConfig(formData.paymentFieldMappings)
        : undefined

      const emailFilter =
        formData.emailFilterFrom || formData.emailFilterSubject
          ? {
              from: formData.emailFilterFrom || undefined,
              subject: formData.emailFilterSubject || undefined
            }
          : undefined

      const ruleData = {
        userProfileId,
        propertyId: formData.propertyId,
        name: formData.name,
        extractForInvoice: formData.extractForInvoice,
        extractForPayment: formData.extractForPayment,
        billType: formData.billType as "municipality" | "levy" | "utility" | "other",
        channel: formData.channel as "email_forward" | "manual_upload",
        emailFilter: emailFilter as Record<string, unknown> | undefined,
        invoiceExtractionConfig: invoiceExtractionConfig,
        paymentExtractionConfig: paymentExtractionConfig,
        invoiceInstruction: formData.invoiceInstruction || undefined,
        paymentInstruction: formData.paymentInstruction || undefined
      }

      const result = initialRule
        ? await updateExtractionRuleAction(initialRule.id, ruleData)
        : await createExtractionRuleAction({
            ...ruleData,
            isActive: true,
            version: 1
          })

      if (result.isSuccess) {
        toast.success(initialRule ? "Extraction rule updated successfully!" : "Extraction rule created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
        // Reset form only if creating new rule (not editing)
        if (!initialRule) {
          setFormData({
            propertyId: "",
            name: "",
            extractForInvoice: false,
            extractForPayment: false,
            billType: "",
            channel: "",
            emailFilterFrom: "",
            emailFilterSubject: "",
            invoiceFieldMappings: [],
            paymentFieldMappings: [],
            invoiceInstruction: "",
            paymentInstruction: ""
          })
          setCurrentStep(1)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create extraction rule")
    } finally {
      setLoading(false)
    }
  }

  const getSteps = () => {
    const baseSteps = [
      {
        number: 1,
        title: "Basic Information",
        icon: FileText,
        description: "Tell us about the rule"
      },
      {
        number: 2,
        title: "What to Extract",
        icon: Settings,
        description: "Choose what data to extract"
      },
      {
        number: 3,
        title: "Field Mappings",
        icon: CheckCircle2,
        description: "Configure what to look for"
      }
    ]

    if (formData.channel === "email_forward") {
      baseSteps.push({
        number: 4,
        title: "Email Filters",
        icon: Mail,
        description: "Filter incoming emails"
      })
    }

    return baseSteps
  }

  const steps = getSteps()

  const canProceedToStep2 = formData.propertyId && formData.name && formData.billType && formData.channel
  const canProceedToStep3 = formData.extractForInvoice || formData.extractForPayment
  const canSubmit =
    (formData.extractForInvoice ? formData.invoiceFieldMappings.length > 0 : true) &&
    (formData.extractForPayment ? formData.paymentFieldMappings.length > 0 : true)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const StepIcon = step.icon
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          const isClickable = idx === 0 || (idx === 1 && canProceedToStep2) || (idx === 2 && canProceedToStep3)

          return (
            <div key={step.number} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && setCurrentStep(step.number)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 flex-1 ${
                  isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted bg-background"
                  }`}
                >
                  <StepIcon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p
                    className={`text-xs font-medium ${
                      isActive ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-muted-foreground text-xs">{step.description}</p>
                </div>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Start by telling us which property and bill type this rule applies to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="propertyId" className="text-sm font-medium">
                Property <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Each property has its own extraction rules. This rule will only apply to bills for the selected property.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., City of Johannesburg Municipality Bill"
                className="h-11"
              />
              <p className="text-muted-foreground text-xs">
                Give this rule a descriptive name so you can easily identify it later
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billType" className="text-sm font-medium">
                Bill Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.billType}
                onValueChange={(value) => setFormData({ ...formData, billType: value })}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select bill type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="municipality">Municipality Bill</SelectItem>
                  <SelectItem value="levy">Levy Statement (Body Corporate)</SelectItem>
                  <SelectItem value="utility">Utility Bill</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                What type of bill will this rule process? This helps us suggest the right field mappings.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel" className="text-sm font-medium">
                How will bills arrive? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.channel}
                onValueChange={(value) => setFormData({ ...formData, channel: value })}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_forward">Email Forward (automatic)</SelectItem>
                  <SelectItem value="manual_upload">Manual Upload (you upload PDFs)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Choose how bills will be received. Email forwarding allows automatic processing when bills arrive via email.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
              >
                Next: What to Extract
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: What to Extract */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>What to Extract</CardTitle>
            <CardDescription>
              Choose what types of data this rule should extract from bills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border-2 border-dashed p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="extractForInvoice"
                  checked={formData.extractForInvoice}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, extractForInvoice: checked === true })
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="extractForInvoice"
                    className="text-base font-semibold cursor-pointer"
                  >
                    Extract for Invoice Generation
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Extract tenant-chargeable items like water usage, electricity usage, and sewerage charges.
                    This data will be used to generate invoices for your tenants.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">Water Charges</Badge>
                    <Badge variant="outline">Electricity</Badge>
                    <Badge variant="outline">Sewerage</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border-2 border-dashed p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="extractForPayment"
                  checked={formData.extractForPayment}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, extractForPayment: checked === true })
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="extractForPayment"
                    className="text-base font-semibold cursor-pointer"
                  >
                    Extract for Payment Processing
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Extract landlord-payable items like body corporate levies, municipality fees, and other charges.
                    This data will be used to create payment instructions for you to pay on behalf of the property.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">Levies</Badge>
                    <Badge variant="outline">Municipality Fees</Badge>
                    <Badge variant="outline">Body Corporate</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-900 text-sm font-medium">You can select both options</p>
                  <p className="text-blue-800 text-xs mt-1">
                    A single rule can extract both invoice and payment data from the same bill. This is useful for
                    bills like municipality statements that contain both tenant-chargeable items (water/electricity)
                    and landlord-payable items (municipality fees).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
              >
                Next: Field Mappings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Field Mappings */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Field Mappings</CardTitle>
            <CardDescription>
              Configure what the system should look for when extracting data from bills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {formData.extractForInvoice && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invoice-instruction" className="mb-2">
                    Custom Extraction Instructions (Optional)
                  </Label>
                  <Textarea
                    id="invoice-instruction"
                    value={formData.invoiceInstruction}
                    onChange={(e) => setFormData({ ...formData, invoiceInstruction: e.target.value })}
                    placeholder="Provide specific instructions for extracting invoice data. For example: 'Extract water charges only if they exceed R500. Ignore any sewerage charges. Look for charges in the 'Charges' section.'"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Add custom context to improve extraction accuracy. If left empty, default instructions will be used.
                  </p>
                </div>
                <FieldMappingBuilder
                  type="invoice"
                  billType={formData.billType}
                  mappings={formData.invoiceFieldMappings}
                  onChange={(mappings) =>
                    setFormData({ ...formData, invoiceFieldMappings: mappings })
                  }
                />
              </div>
            )}

            {formData.extractForPayment && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="payment-instruction" className="mb-2">
                    Custom Extraction Instructions (Optional)
                  </Label>
                  <Textarea
                    id="payment-instruction"
                    value={formData.paymentInstruction}
                    onChange={(e) => setFormData({ ...formData, paymentInstruction: e.target.value })}
                    placeholder="Provide specific instructions for extracting payment data. For example: 'Extract only levies from the body corporate. Look for beneficiary account numbers starting with '62'. Include payment references from the 'Payment Details' section.'"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Add custom context to improve extraction accuracy. If left empty, default instructions will be used.
                  </p>
                </div>
                <FieldMappingBuilder
                  type="payment"
                  billType={formData.billType}
                  mappings={formData.paymentFieldMappings}
                  onChange={(mappings) =>
                    setFormData({ ...formData, paymentFieldMappings: mappings })
                  }
                />
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              {formData.channel === "email_forward" ? (
                <Button type="button" onClick={() => setCurrentStep(4)} disabled={!canSubmit}>
                  Next: Email Filters
                </Button>
              ) : (
                <Button type="submit" disabled={loading || !canSubmit}>
                  {loading ? "Creating..." : "Create Rule"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Email Filters (if email forward) */}
      {currentStep === 4 && formData.channel === "email_forward" && (
        <Card>
          <CardHeader>
            <CardTitle>Email Filters</CardTitle>
            <CardDescription>
              Optionally filter which emails should trigger this rule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="emailFilterFrom" className="text-sm font-medium">
                Email From (Optional)
              </Label>
              <Input
                id="emailFilterFrom"
                value={formData.emailFilterFrom}
                onChange={(e) => setFormData({ ...formData, emailFilterFrom: e.target.value })}
                placeholder="e.g., bills@cityofjhb.gov.za"
                className="h-11"
              />
              <p className="text-muted-foreground text-xs">
                Only process emails from this sender. Leave empty to process all emails.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailFilterSubject" className="text-sm font-medium">
                Email Subject Contains (Optional)
              </Label>
              <Input
                id="emailFilterSubject"
                value={formData.emailFilterSubject}
                onChange={(e) => setFormData({ ...formData, emailFilterSubject: e.target.value })}
                placeholder="e.g., Municipality Bill"
                className="h-11"
              />
              <p className="text-muted-foreground text-xs">
                Only process emails with this text in the subject line. Leave empty to process all emails.
              </p>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="text-muted-foreground text-xs">
                <strong>Tip:</strong> Email filters help ensure bills are processed by the correct rule. If you receive
                bills from multiple sources, use these filters to route them automatically.
              </p>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button type="submit" disabled={loading || !canSubmit}>
                {loading ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}

