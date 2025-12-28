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
import { Info, CheckCircle2, FileText, Settings, Mail, Receipt, CreditCard } from "lucide-react"
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
    emailProcessingInstruction: string
    invoiceFieldMappings: FieldMapping[]
    paymentFieldMappings: FieldMapping[]
    invoiceInstruction: string
    paymentInstruction: string
    preferredLane?: string
    lane2FollowRedirects?: boolean
    lane2MaxRedirects?: number
    lane3Method?: string
    lane3PinInputSelector?: string
    lane3SubmitButtonSelector?: string
    lane3PdfDownloadSelector?: string
    lane3WaitForSelector?: string
    lane3AgenticMaxSteps?: number
    lane3AgenticMaxTime?: number
    lane3AgenticAllowedDomains?: string
    lane3AgenticPortalContext?: string
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
  const [formData, setFormData] = useState({
      propertyId: "",
      name: "",
      extractForInvoice: false,
      extractForPayment: false,
      billType: "",
      channel: "",
      emailFilterFrom: "",
      emailFilterSubject: "",
      emailProcessingInstruction: "",
      invoiceFieldMappings: [] as FieldMapping[],
      paymentFieldMappings: [] as FieldMapping[],
      invoiceInstruction: "",
    paymentInstruction: "",
    preferredLane: "auto",
    lane2FollowRedirects: true,
    lane2MaxRedirects: 5,
    lane3Method: "agentic",
    lane3PinInputSelector: "",
    lane3SubmitButtonSelector: "",
    lane3PdfDownloadSelector: "",
    lane3WaitForSelector: "",
    lane3AgenticMaxSteps: 50,
    lane3AgenticMaxTime: 120,
    lane3AgenticAllowedDomains: "",
    lane3AgenticPortalContext: "",
    ...initialFormData
  })

  // Reset to step 3 if channel changes and we're on step 4 (email forward only)
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

      // Build lane3Config with agentic browser configuration
      const lane3Config = formData.lane3Method === "agentic" || formData.lane3Method === "auto"
        ? {
            method: "agentic",
            agenticConfig: {
              maxSteps: formData.lane3AgenticMaxSteps || 50,
              maxTime: formData.lane3AgenticMaxTime || 120,
              allowedDomains: formData.lane3AgenticAllowedDomains
                ? formData.lane3AgenticAllowedDomains.split(",").map(d => d.trim()).filter(Boolean)
                : [],
              portalContext: formData.lane3AgenticPortalContext || undefined
            }
          }
        : undefined

      // Build lane2Config
      const lane2Config = {
        followRedirects: formData.lane2FollowRedirects ?? true,
        maxRedirects: formData.lane2MaxRedirects || 5
      }

      const ruleData = {
        userProfileId,
        propertyId: formData.propertyId,
        name: formData.name,
        extractForInvoice: formData.extractForInvoice,
        extractForPayment: formData.extractForPayment,
        billType: formData.billType as "municipality" | "levy" | "utility" | "other",
        channel: formData.channel as "email_forward" | "manual_upload" | "agentic",
        emailFilter: emailFilter as Record<string, unknown> | undefined,
        invoiceExtractionConfig: invoiceExtractionConfig,
        paymentExtractionConfig: paymentExtractionConfig,
        invoiceInstruction: formData.invoiceInstruction || undefined,
        paymentInstruction: formData.paymentInstruction || undefined,
        emailProcessingInstruction: formData.emailProcessingInstruction || undefined,
        preferredLane: formData.preferredLane || "auto",
        lane2Config: lane2Config as Record<string, unknown> | undefined,
        lane3Config: lane3Config as Record<string, unknown> | undefined
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
            emailProcessingInstruction: "",
            invoiceFieldMappings: [],
            paymentFieldMappings: [],
            invoiceInstruction: "",
            paymentInstruction: "",
            preferredLane: "auto",
            lane2FollowRedirects: true,
            lane2MaxRedirects: 5,
            lane3Method: "agentic",
            lane3PinInputSelector: "",
            lane3SubmitButtonSelector: "",
            lane3PdfDownloadSelector: "",
            lane3WaitForSelector: "",
            lane3AgenticMaxSteps: 50,
            lane3AgenticMaxTime: 120,
            lane3AgenticAllowedDomains: "",
            lane3AgenticPortalContext: ""
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
                  <SelectItem value="agentic">Agentic (automated bot)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Choose how bills will be received. Email forwarding allows automatic processing when bills arrive via email.
                Agentic mode uses automated bots to log into accounts and download documents (coming soon).
              </p>
              {formData.channel === "agentic" && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
                  <p className="text-yellow-900 text-sm font-medium dark:text-yellow-200">
                    Agentic Mode (Coming Soon)
                  </p>
                  <p className="text-yellow-800 text-xs mt-1 dark:text-yellow-300">
                    This feature will allow automated bots to log into accounts, download bills, and process them automatically.
                    Configuration options for agentic workflows will be available in a future update.
                  </p>
                </div>
              )}
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
              <div className="space-y-4 rounded-lg border-2 border-green-500/50 bg-green-50/30 p-6 dark:border-green-500/30 dark:bg-green-950/10">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                    Invoice Extraction
                  </h3>
                  <Badge className="bg-green-600 text-white dark:bg-green-700">
                    Tenant Charges
                  </Badge>
                </div>
                <div>
                  <Label htmlFor="invoice-instruction" className="mb-2">
                    Custom Extraction Instructions (Optional)
                  </Label>
                  <Textarea
                    id="invoice-instruction"
                    value={formData.invoiceInstruction}
                    onChange={(e) => setFormData({ ...formData, invoiceInstruction: e.target.value })}
                    placeholder="Provide specific instructions for extracting invoice data. For example: 'Extract water charges only if they exceed R500. Ignore any sewerage charges. Look for charges in the 'Charges' section.'"
                    className="min-h-[100px] border-green-300 dark:border-green-800"
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
              <div className="space-y-4 rounded-lg border-2 border-purple-500/50 bg-purple-50/30 p-6 dark:border-purple-500/30 dark:bg-purple-950/10">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                    Payment Extraction
                  </h3>
                  <Badge className="bg-purple-600 text-white dark:bg-purple-700">
                    Landlord Payables
                  </Badge>
                </div>
                <div>
                  <Label htmlFor="payment-instruction" className="mb-2">
                    Custom Extraction Instructions (Optional)
                  </Label>
                  <Textarea
                    id="payment-instruction"
                    value={formData.paymentInstruction}
                    onChange={(e) => setFormData({ ...formData, paymentInstruction: e.target.value })}
                    placeholder="Provide specific instructions for extracting payment data. For example: 'Extract only levies from the body corporate. Look for beneficiary account numbers starting with '62'. Include payment references from the 'Payment Details' section.'"
                    className="min-h-[100px] border-purple-300 dark:border-purple-800"
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

            <div className="space-y-2">
              <Label htmlFor="emailProcessingInstruction" className="text-sm font-medium">
                Email Processing Instructions (Optional)
              </Label>
              <Textarea
                id="emailProcessingInstruction"
                value={formData.emailProcessingInstruction}
                onChange={(e) => setFormData({ ...formData, emailProcessingInstruction: e.target.value })}
                placeholder="Example: 'If multiple files are found, select the one with 'statement' or 'invoice' in the filename. Download from links that contain 'bills' in the URL path.'"
                className="min-h-[100px]"
              />
              <p className="text-muted-foreground text-xs">
                Provide custom instructions for AI to guide email processing decisions. This helps when documents are embedded as links rather than attachments, or when multiple files exist. Leave empty to use default behavior.
              </p>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="text-muted-foreground text-xs">
                <strong>Tip:</strong> Email filters help ensure bills are processed by the correct rule. If you receive
                bills from multiple sources, use these filters to route them automatically. Email processing instructions help the AI intelligently handle documents embedded as links or select relevant files when multiple options exist.
              </p>
            </div>

            {/* Lane Configuration */}
            <div className="space-y-6 border-t pt-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Processing Lane Configuration</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Configure how emails should be processed. The system will automatically choose the best lane, but you can specify preferences.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredLane" className="text-sm font-medium">
                  Preferred Processing Lane
                </Label>
                <Select
                  value={formData.preferredLane}
                  onValueChange={(value) => setFormData({ ...formData, preferredLane: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="lane1_attachments">Lane 1: Attachments Only</SelectItem>
                    <SelectItem value="lane2_direct">Lane 2: Direct Download</SelectItem>
                    <SelectItem value="lane3_interactive">Lane 3: Interactive Portal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Auto mode intelligently selects the best lane. Specify a lane if you know how your bills arrive.
                </p>
              </div>

              {/* Lane 2 Configuration */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Lane 2: Direct Download Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="lane2FollowRedirects"
                      checked={formData.lane2FollowRedirects}
                      onChange={(e) =>
                        setFormData({ ...formData, lane2FollowRedirects: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="lane2FollowRedirects" className="text-sm">
                      Follow Redirects
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lane2MaxRedirects" className="text-sm">
                      Max Redirects
                    </Label>
                    <Input
                      id="lane2MaxRedirects"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.lane2MaxRedirects}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lane2MaxRedirects: parseInt(e.target.value) || 5
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Lane 3 Configuration */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-medium">Lane 3: Interactive Portal Settings (Agentic Browser)</h4>
                <p className="text-sm text-muted-foreground">
                  Uses Browser Use Cloud API for AI-powered browser automation. The agentic browser reads the email and determines what inputs are needed.
                </p>

                <div className="space-y-3 mt-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md">
                  <p className="text-sm font-medium">Agentic Browser Configuration</p>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="lane3AgenticMaxSteps" className="text-xs">
                          Max Steps
                        </Label>
                        <Input
                          id="lane3AgenticMaxSteps"
                          type="number"
                          min="10"
                          max="100"
                          value={formData.lane3AgenticMaxSteps}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lane3AgenticMaxSteps: parseInt(e.target.value) || 50
                            })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lane3AgenticMaxTime" className="text-xs">
                          Max Time (seconds)
                        </Label>
                        <Input
                          id="lane3AgenticMaxTime"
                          type="number"
                          min="30"
                          max="300"
                          value={formData.lane3AgenticMaxTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lane3AgenticMaxTime: parseInt(e.target.value) || 120
                            })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lane3AgenticAllowedDomains" className="text-xs">
                          Allowed Domains (comma-separated)
                        </Label>
                        <Input
                          id="lane3AgenticAllowedDomains"
                          value={formData.lane3AgenticAllowedDomains}
                          onChange={(e) =>
                            setFormData({ ...formData, lane3AgenticAllowedDomains: e.target.value })
                          }
                          placeholder="e.g., system.angor.co.za, example.com"
                          className="h-9 text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Security: Only these domains can be accessed by the agentic browser. Leave empty to allow all domains (not recommended).
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="lane3AgenticPortalContext" className="text-xs">
                          Portal Context / Instructions
                        </Label>
                        <Textarea
                          id="lane3AgenticPortalContext"
                          value={formData.lane3AgenticPortalContext}
                          onChange={(e) =>
                            setFormData({ ...formData, lane3AgenticPortalContext: e.target.value })
                          }
                          placeholder="e.g., The portal requires a PIN entry. Extract the PIN from the email and enter it into the PIN input fields (OTP1, OTP2, etc.). After entering the PIN, click Submit to view the statement, then download the PDF."
                          className="h-24 text-xs"
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Provide specific instructions about how the portal works. This helps the browser agent understand what to do (e.g., PIN entry fields, navigation steps, where to find the download button). This context is prioritized over email content.
                        </p>
                      </div>
                    </div>
                  </div>
              </div>
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

