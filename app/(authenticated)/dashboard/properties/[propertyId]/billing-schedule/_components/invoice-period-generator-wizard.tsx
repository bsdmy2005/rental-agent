"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { generateInvoicePeriodsForTemplatesAction } from "@/actions/billing-periods-actions"
import { toast } from "sonner"
import { Plus, Calendar, Check, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { type SelectRentalInvoiceTemplate, type SelectTenant } from "@/db/schema"

interface InvoicePeriodGeneratorWizardProps {
  propertyId: string
  invoiceTemplates: SelectRentalInvoiceTemplate[]
  tenants: SelectTenant[]
}

export function InvoicePeriodGeneratorWizard({
  propertyId,
  invoiceTemplates,
  tenants
}: InvoicePeriodGeneratorWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string>("")
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    generationDay: 5
  })

  // Get template for selected tenant (only one per tenant now)
  const availableTemplate = useMemo(
    () => invoiceTemplates.find((t) => t.tenantId === selectedTenantId && t.isActive),
    [selectedTenantId, invoiceTemplates]
  )

  // Auto-select template when tenant is selected (only one template per tenant)
  useEffect(() => {
    if (selectedTenantId && availableTemplate) {
      setSelectedTemplates(new Set([availableTemplate.id]))
      // Update generation day to match template's default
      setFormData((prev) => ({
        ...prev,
        generationDay: availableTemplate.generationDayOfMonth || 5
      }))
    } else {
      setSelectedTemplates(new Set())
    }
  }, [selectedTenantId, availableTemplate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!selectedTenantId) {
        toast.error("Please select a tenant")
        setLoading(false)
        return
      }

      if (!formData.startDate || !formData.endDate) {
        toast.error("Please select both start and end dates")
        setLoading(false)
        return
      }

      if (!availableTemplate) {
        toast.error("No invoice template found for selected tenant")
        setLoading(false)
        return
      }

      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)

      if (endDate < startDate) {
        toast.error("End date must be after start date")
        setLoading(false)
        return
      }

      // Validate generation day
      if (formData.generationDay < 1 || formData.generationDay > 31) {
        toast.error("Generation day must be between 1 and 31")
        setLoading(false)
        return
      }

      // Prepare template config (only one template per tenant)
      const templateConfigs = [
        {
          templateId: availableTemplate.id,
          generationDay: formData.generationDay
        }
      ]

      const result = await generateInvoicePeriodsForTemplatesAction(
        propertyId,
        selectedTenantId,
        startDate,
        endDate,
        templateConfigs
      )

      if (result.isSuccess) {
        toast.success(`Generated ${result.data?.length || 0} invoice periods`)
        setFormData({
          startDate: "",
          endDate: "",
          generationDay: availableTemplate?.generationDayOfMonth || 5
        })
        if (availableTemplate) {
          setSelectedTemplates(new Set([availableTemplate.id]))
        }
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error generating invoice periods:", error)
      toast.error("Failed to generate invoice periods")
    } finally {
      setLoading(false)
    }
  }

  const tenantsWithTemplates = useMemo(
    () => tenants.filter((t) => invoiceTemplates.some((template) => template.tenantId === t.id && template.isActive)),
    [tenants, invoiceTemplates]
  )

  // Always show the form, even if no tenants with templates exist yet
  // This allows users to see what's needed

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>Generate Invoice Periods</CardTitle>
        </div>
        <CardDescription>
          Select a tenant and invoice templates, then specify date range to generate periods. Each template will generate periods based on its scheduled generation day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Selection */}
          <div className="space-y-2">
            <Label htmlFor="tenant">Tenant</Label>
            {tenantsWithTemplates.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3">
                <p className="text-sm text-yellow-900 dark:text-yellow-200">
                  No tenants with invoice templates found. Please create tenants and invoice templates first.
                </p>
              </div>
            ) : (
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId} required>
                <SelectTrigger id="tenant" className="h-11">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenantsWithTemplates.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template Display (only one per tenant) */}
          {selectedTenantId && availableTemplate && (
            <div className="space-y-2">
              <Label>Invoice Template</Label>
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="font-medium">{availableTemplate.name || "Rental Invoice Template"}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Generation day: {availableTemplate.generationDayOfMonth} of each month
                </div>
                {availableTemplate.description && (
                  <div className="text-sm text-muted-foreground mt-1">{availableTemplate.description}</div>
                )}
              </div>
            </div>
          )}

          {selectedTenantId && !availableTemplate && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3">
              <p className="text-sm text-yellow-900 dark:text-yellow-200">
                No invoice template found for this tenant. Please create one first.
              </p>
            </div>
          )}

          {/* Generation Day Input */}
          {selectedTenantId && availableTemplate && (
            <div className="space-y-2">
              <Label htmlFor="generationDay">Generation Day of Month</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="generationDay"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={formData.generationDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generationDay: parseInt(e.target.value, 10) || 5
                    })
                  }
                  className="h-11 w-24"
                />
                <span className="text-muted-foreground text-sm">of each month</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Day of the month when invoice periods will be generated (1-31). Default: {availableTemplate.generationDayOfMonth || 5}
              </p>
            </div>
          )}

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                First month for period generation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Last month for period generation
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !selectedTenantId || !availableTemplate}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Generate Invoice Periods"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

