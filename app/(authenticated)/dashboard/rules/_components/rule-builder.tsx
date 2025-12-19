"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { createExtractionRuleAction } from "@/actions/extraction-rules-actions"
import { toast } from "sonner"

interface RuleBuilderProps {
  userProfileId: string
  properties: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

export function RuleBuilder({ userProfileId, properties, onSuccess }: RuleBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    propertyId: "",
    name: "",
    extractForInvoice: false,
    extractForPayment: false,
    billType: "",
    channel: "",
    emailFilterFrom: "",
    emailFilterSubject: "",
    invoiceExtractionConfig: "",
    paymentExtractionConfig: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate at least one output type is selected
      if (!formData.extractForInvoice && !formData.extractForPayment) {
        toast.error("Please select at least one output type (Invoice or Payment)")
        setLoading(false)
        return
      }

      // Validate property is selected
      if (!formData.propertyId) {
        toast.error("Please select a property")
        setLoading(false)
        return
      }

      // Parse extraction configs
      let invoiceExtractionConfig: Record<string, unknown> | undefined = undefined
      let paymentExtractionConfig: Record<string, unknown> | undefined = undefined

      if (formData.extractForInvoice) {
        try {
          invoiceExtractionConfig = formData.invoiceExtractionConfig
            ? JSON.parse(formData.invoiceExtractionConfig)
            : {}
        } catch (error) {
          toast.error("Invalid JSON in invoice extraction config")
          setLoading(false)
          return
        }
      }

      if (formData.extractForPayment) {
        try {
          paymentExtractionConfig = formData.paymentExtractionConfig
            ? JSON.parse(formData.paymentExtractionConfig)
            : {}
        } catch (error) {
          toast.error("Invalid JSON in payment extraction config")
          setLoading(false)
          return
        }
      }

      const emailFilter =
        formData.emailFilterFrom || formData.emailFilterSubject
          ? {
              from: formData.emailFilterFrom || undefined,
              subject: formData.emailFilterSubject || undefined
            }
          : undefined

      const result = await createExtractionRuleAction({
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
        isActive: true,
        version: 1
      })

      if (result.isSuccess) {
        toast.success("Extraction rule created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
        // Reset form
        setFormData({
          propertyId: "",
          name: "",
          extractForInvoice: false,
          extractForPayment: false,
          billType: "",
          channel: "",
          emailFilterFrom: "",
          emailFilterSubject: "",
          invoiceExtractionConfig: "",
          paymentExtractionConfig: ""
        })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create extraction rule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="propertyId">Property *</Label>
        <Select
          value={formData.propertyId}
          onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
          required
        >
          <SelectTrigger>
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
        <p className="text-muted-foreground mt-1 text-xs">
          Rules are property-specific - each property has its own rules
        </p>
      </div>
      <div>
        <Label htmlFor="name">Rule Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., City of Johannesburg Municipality Bill"
        />
      </div>
      <div>
        <Label>Output Types *</Label>
        <div className="mt-2 space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="extractForInvoice"
              checked={formData.extractForInvoice}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, extractForInvoice: checked === true })
              }
            />
            <Label
              htmlFor="extractForInvoice"
              className="text-sm font-normal cursor-pointer"
            >
              Extract for Invoice Generation
            </Label>
          </div>
          <p className="text-muted-foreground ml-6 text-xs">
            Extract tenant-chargeable items (water, electricity, sewerage) for tenant invoices
          </p>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="extractForPayment"
              checked={formData.extractForPayment}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, extractForPayment: checked === true })
              }
            />
            <Label
              htmlFor="extractForPayment"
              className="text-sm font-normal cursor-pointer"
            >
              Extract for Payment Processing
            </Label>
          </div>
          <p className="text-muted-foreground ml-6 text-xs">
            Extract landlord-payable items (levies, fees, beneficiary details) for payment execution
          </p>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          A single rule can extract both invoice and payment data from the same bill. Each output type has its own extraction configuration.
        </p>
      </div>
      <div>
        <Label htmlFor="billType">Bill Type *</Label>
        <Select value={formData.billType} onValueChange={(value) => setFormData({ ...formData, billType: value })} required>
          <SelectTrigger>
            <SelectValue placeholder="Select bill type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="municipality">Municipality</SelectItem>
            <SelectItem value="levy">Levy</SelectItem>
            <SelectItem value="utility">Utility</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="channel">Channel *</Label>
        <Select value={formData.channel} onValueChange={(value) => setFormData({ ...formData, channel: value })} required>
          <SelectTrigger>
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email_forward">Email Forward</SelectItem>
            <SelectItem value="manual_upload">Manual Upload</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {formData.channel === "email_forward" && (
        <>
          <div>
            <Label htmlFor="emailFilterFrom">Email From (Optional)</Label>
            <Input
              id="emailFilterFrom"
              value={formData.emailFilterFrom}
              onChange={(e) => setFormData({ ...formData, emailFilterFrom: e.target.value })}
              placeholder="e.g., bills@cityofjhb.gov.za"
            />
          </div>
          <div>
            <Label htmlFor="emailFilterSubject">Email Subject Contains (Optional)</Label>
            <Input
              id="emailFilterSubject"
              value={formData.emailFilterSubject}
              onChange={(e) => setFormData({ ...formData, emailFilterSubject: e.target.value })}
              placeholder="e.g., Municipality Bill"
            />
          </div>
        </>
      )}
      {formData.extractForInvoice && (
        <div>
          <Label htmlFor="invoiceExtractionConfig">Invoice Extraction Config (JSON) *</Label>
          <Textarea
            id="invoiceExtractionConfig"
            required={formData.extractForInvoice}
            value={formData.invoiceExtractionConfig}
            onChange={(e) =>
              setFormData({ ...formData, invoiceExtractionConfig: e.target.value })
            }
            placeholder='{"fieldMappings": {"water": {"label": "Water Charges", "patterns": ["water"], "extractUsage": true}, "electricity": {"label": "Electricity", "patterns": ["electricity"], "extractUsage": true}, "sewerage": {"label": "Sewerage", "patterns": ["sewerage", "sewer"]}}}'
            rows={8}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Define field mappings for tenant-chargeable items (water, electricity, sewerage)
          </p>
        </div>
      )}
      {formData.extractForPayment && (
        <div>
          <Label htmlFor="paymentExtractionConfig">Payment Extraction Config (JSON) *</Label>
          <Textarea
            id="paymentExtractionConfig"
            required={formData.extractForPayment}
            value={formData.paymentExtractionConfig}
            onChange={(e) =>
              setFormData({ ...formData, paymentExtractionConfig: e.target.value })
            }
            placeholder='{"fieldMappings": {"levy": {"label": "Body Corporate Levy", "patterns": ["levy", "body corporate"], "extractBeneficiary": true, "extractAccountNumber": true}, "municipality": {"label": "Municipality Charges", "patterns": ["municipality", "city council"], "extractBeneficiary": true}}}'
            rows={8}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Define field mappings for landlord-payable items (levies, fees, beneficiary details)
          </p>
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Rule"}
      </Button>
    </form>
  )
}

