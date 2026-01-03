"use client"

import { useState, useEffect } from "react"
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
import { FieldMappingBuilder, type FieldMapping } from "@/app/(authenticated)/dashboard/rules/_components/field-mapping-builder"
import { Info, CheckCircle2, FileText, Settings, Mail, Receipt, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { BillTemplateState } from "../wizard-state"

interface WizardRuleBuilderProps {
  billTemplate: BillTemplateState
  onSave: (ruleData: BillTemplateState["newRule"]) => void
  onCancel: () => void
}

export function WizardRuleBuilder({ billTemplate, onSave, onCancel }: WizardRuleBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<NonNullable<BillTemplateState["newRule"]>>(() => {
    if (billTemplate.newRule) {
      return billTemplate.newRule
    }
    return {
      name: `${billTemplate.name} - Extraction Rule`,
      extractForInvoice: false,
      extractForPayment: false,
      channel: "email_forward",
      emailFilterFrom: "",
      emailFilterSubject: "",
      emailProcessingInstruction: "",
      invoiceFieldMappings: [],
      paymentFieldMappings: [],
      invoiceInstruction: "",
      paymentInstruction: ""
    }
  })

  // Reset to step 3 if channel changes and we're on step 4 (email forward only)
  useEffect(() => {
    if (currentStep === 4 && formData.channel !== "email_forward") {
      setCurrentStep(3)
    }
  }, [formData.channel, currentStep])

  // Auto-suggest field mappings based on bill type
  useEffect(() => {
    if (billTemplate.billType && formData.extractForInvoice && formData.invoiceFieldMappings.length === 0) {
      const suggestions: FieldMapping[] = []
      
      if (billTemplate.billType === "municipality") {
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
      } else if (billTemplate.billType === "levy") {
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
      } else if (billTemplate.billType === "utility") {
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
      }
    }

    if (billTemplate.billType && formData.extractForPayment && formData.paymentFieldMappings.length === 0) {
      const suggestions: FieldMapping[] = []
      
      if (billTemplate.billType === "municipality") {
        suggestions.push({
          id: "1",
          type: "municipality",
          label: "Municipality Charges",
          patterns: ["municipality", "city council", "municipal", "rates"],
          extractBeneficiary: true,
          extractAccountNumber: true
        })
      } else if (billTemplate.billType === "levy") {
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
      }
    }
  }, [billTemplate.billType, formData.extractForInvoice, formData.extractForPayment])

  const handleSave = () => {
    // Validate
    if (!formData.extractForInvoice && !formData.extractForPayment) {
      return // Can't save without at least one output type
    }

    if (formData.extractForInvoice && formData.invoiceFieldMappings.length === 0) {
      return // Can't save without field mappings
    }

    if (formData.extractForPayment && formData.paymentFieldMappings.length === 0) {
      return // Can't save without field mappings
    }

    onSave(formData)
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
  const canProceedToStep2 = formData.name && billTemplate.billType && formData.channel
  const canProceedToStep3 = formData.extractForInvoice || formData.extractForPayment
  const canSave =
    (formData.extractForInvoice ? formData.invoiceFieldMappings.length > 0 : true) &&
    (formData.extractForPayment ? formData.paymentFieldMappings.length > 0 : true)

  return (
    <div className="space-y-6">
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
              Configure the basic settings for this extraction rule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rule-name" className="text-sm font-medium">
                Rule Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-name"
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
              <Label className="text-sm font-medium">
                Bill Type <span className="text-destructive">*</span>
              </Label>
              <Input
                value={billTemplate.billType}
                disabled
                className="h-11"
              />
              <p className="text-muted-foreground text-xs">
                Bill type is set from the bill template above
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel" className="text-sm font-medium">
                How will bills arrive? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.channel}
                onValueChange={(value: "email_forward" | "manual_upload" | "agentic") => setFormData({ ...formData, channel: value })}
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
                  id="extract-invoice"
                  checked={formData.extractForInvoice}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, extractForInvoice: checked === true })
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="extract-invoice"
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
                  id="extract-payment"
                  checked={formData.extractForPayment}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, extractForPayment: checked === true })
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="extract-payment"
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
                    A single rule can extract both invoice and payment data from the same bill.
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
                    value={formData.invoiceInstruction || ""}
                    onChange={(e) => setFormData({ ...formData, invoiceInstruction: e.target.value })}
                    placeholder="Provide specific instructions for extracting invoice data..."
                    className="min-h-[100px] border-green-300 dark:border-green-800"
                  />
                </div>
                <FieldMappingBuilder
                  type="invoice"
                  billType={billTemplate.billType}
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
                    value={formData.paymentInstruction || ""}
                    onChange={(e) => setFormData({ ...formData, paymentInstruction: e.target.value })}
                    placeholder="Provide specific instructions for extracting payment data..."
                    className="min-h-[100px] border-purple-300 dark:border-purple-800"
                  />
                </div>
                <FieldMappingBuilder
                  type="payment"
                  billType={billTemplate.billType}
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
                <Button type="button" onClick={() => setCurrentStep(4)} disabled={!canSave}>
                  Next: Email Filters
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={!canSave}>
                    Save Rule Configuration
                  </Button>
                </div>
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
                value={formData.emailFilterFrom || ""}
                onChange={(e) => setFormData({ ...formData, emailFilterFrom: e.target.value })}
                placeholder="e.g., bills@cityofjhb.gov.za"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailFilterSubject" className="text-sm font-medium">
                Email Subject Contains (Optional)
              </Label>
              <Input
                id="emailFilterSubject"
                value={formData.emailFilterSubject || ""}
                onChange={(e) => setFormData({ ...formData, emailFilterSubject: e.target.value })}
                placeholder="e.g., Municipality Bill"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailProcessingInstruction" className="text-sm font-medium">
                Email Processing Instructions (Optional)
              </Label>
              <Textarea
                id="emailProcessingInstruction"
                value={formData.emailProcessingInstruction || ""}
                onChange={(e) => setFormData({ ...formData, emailProcessingInstruction: e.target.value })}
                placeholder="Example: 'If multiple files are found, select the one with 'statement' in the filename...'"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={!canSave}>
                  Save Rule Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

