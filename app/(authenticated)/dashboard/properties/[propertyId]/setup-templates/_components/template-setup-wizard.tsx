"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Plus, Trash2, Check } from "lucide-react"
import { createBillTemplateAction } from "@/actions/bill-templates-actions"
import { createPayableTemplateAction } from "@/actions/payable-templates-actions"
import { createBillArrivalScheduleAction } from "@/actions/bill-arrival-schedules-actions"
import { createPayableScheduleAction } from "@/actions/payable-schedules-actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface TemplateSetupWizardProps {
  propertyId: string
}

type BillTemplate = {
  name: string
  billType: "municipality" | "levy" | "utility" | "other"
  expectedDayOfMonth: number | null
}

type PayableTemplate = {
  name: string
  dependsOnBillTemplateIds: string[]
  scheduledDayOfMonth: number | null
}

export function TemplateSetupWizard({ propertyId }: TemplateSetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<"bills" | "payables" | "complete">("bills")
  const [loading, setLoading] = useState(false)

  // Bill templates state
  const [billTemplates, setBillTemplates] = useState<BillTemplate[]>([
    { name: "", billType: "municipality", expectedDayOfMonth: null }
  ])
  const [createdBillTemplateIds, setCreatedBillTemplateIds] = useState<string[]>([])

  // Payable templates state
  const [payableTemplates, setPayableTemplates] = useState<PayableTemplate[]>([
    { name: "", dependsOnBillTemplateIds: [], scheduledDayOfMonth: null }
  ])

  const addBillTemplate = () => {
    setBillTemplates([...billTemplates, { name: "", billType: "municipality", expectedDayOfMonth: null }])
  }

  const removeBillTemplate = (index: number) => {
    setBillTemplates(billTemplates.filter((_, i) => i !== index))
  }

  const updateBillTemplate = (index: number, field: keyof BillTemplate, value: string | number | null) => {
    const updated = [...billTemplates]
    updated[index] = { ...updated[index], [field]: value }
    setBillTemplates(updated)
  }

  const addPayableTemplate = () => {
    setPayableTemplates([
      ...payableTemplates,
      { name: "", dependsOnBillTemplateIds: [], scheduledDayOfMonth: null }
    ])
  }

  const removePayableTemplate = (index: number) => {
    setPayableTemplates(payableTemplates.filter((_, i) => i !== index))
  }

  const updatePayableTemplate = (index: number, field: keyof PayableTemplate, value: string | string[] | number | null) => {
    const updated = [...payableTemplates]
    updated[index] = { ...updated[index], [field]: value }
    setPayableTemplates(updated)
  }

  const handleSaveBillTemplates = async () => {
    setLoading(true)
    const templateIds: string[] = []

    try {
      for (const template of billTemplates) {
        if (!template.name.trim()) continue

        const result = await createBillTemplateAction({
          propertyId,
          name: template.name.trim(),
          billType: template.billType,
          description: null,
          isActive: true
        })

        if (result.isSuccess && result.data) {
          templateIds.push(result.data.id)

          // Create arrival schedule if day is specified
          if (template.expectedDayOfMonth) {
            await createBillArrivalScheduleAction({
              billTemplateId: result.data.id,
              propertyId,
              expectedDayOfMonth: template.expectedDayOfMonth,
              isActive: true
            })
          }
        }
      }

      if (templateIds.length > 0) {
        setCreatedBillTemplateIds(templateIds)
        toast.success(`Created ${templateIds.length} bill template(s)`)
        setStep("payables")
      } else {
        toast.error("Please create at least one bill template")
      }
    } catch (error) {
      toast.error("Failed to create bill templates")
    } finally {
      setLoading(false)
    }
  }

  const handleSavePayableTemplates = async () => {
    setLoading(true)

    try {
      for (const template of payableTemplates) {
        if (!template.name.trim()) continue

        const result = await createPayableTemplateAction({
          propertyId,
          name: template.name.trim(),
          description: null,
          dependsOnBillTemplateIds: template.dependsOnBillTemplateIds,
          isActive: true
        })

        if (result.isSuccess && result.data) {
          // Create schedule if day is specified
          if (template.scheduledDayOfMonth) {
            await createPayableScheduleAction({
              payableTemplateId: result.data.id,
              propertyId,
              scheduledDayOfMonth: template.scheduledDayOfMonth,
              isActive: true
            })
          }
        }
      }

      toast.success("Templates setup complete!")
      setStep("complete")
    } catch (error) {
      toast.error("Failed to create payable templates")
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push(`/dashboard/properties/${propertyId}`)
  }

  const handleFinish = () => {
    router.push(`/dashboard/properties/${propertyId}`)
  }

  if (step === "complete") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Templates Setup Complete!</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                You can always add or modify templates from the Billing page.
              </p>
            </div>
            <Button onClick={handleFinish} size="lg">
              Go to Property
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "bills" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          1
        </div>
        <div className={`h-1 flex-1 ${step === "payables" ? "bg-primary" : "bg-muted"}`} />
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            step === "payables" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          2
        </div>
      </div>

      {step === "bills" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Define Bill Templates</CardTitle>
            <CardDescription>
              Define the types of bills you expect to receive for this property (e.g., Municipality
              Water Bill, Body Corporate Levy)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {billTemplates.map((template, index) => (
              <div key={index} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Bill Template {index + 1}</h4>
                  {billTemplates.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBillTemplate(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., City of Cape Town Water Bill"
                    value={template.name}
                    onChange={(e) => updateBillTemplate(index, "name", e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bill Type</Label>
                    <Select
                      value={template.billType}
                      onValueChange={(value: "municipality" | "levy" | "utility" | "other") =>
                        updateBillTemplate(index, "billType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="municipality">Municipality</SelectItem>
                        <SelectItem value="levy">Levy</SelectItem>
                        <SelectItem value="utility">Utility</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Expected Arrival Day (Optional)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="e.g., 3 for 3rd of month"
                      value={template.expectedDayOfMonth || ""}
                      onChange={(e) =>
                        updateBillTemplate(
                          index,
                          "expectedDayOfMonth",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addBillTemplate} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Bill Template
            </Button>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleSkip} disabled={loading}>
                Skip for Now
              </Button>
              <Button onClick={handleSaveBillTemplates} disabled={loading}>
                {loading ? "Saving..." : "Continue to Payables"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "payables" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Define Payable Templates</CardTitle>
            <CardDescription>
              Define the types of payments you need to make for this property (e.g., Body Corporate
              Levy Payment, Municipality Tax Payment)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {payableTemplates.map((template, index) => (
              <div key={index} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium">Payable Template {index + 1}</h4>
                  {payableTemplates.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayableTemplate(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Body Corporate Levy Payment"
                    value={template.name}
                    onChange={(e) => updatePayableTemplate(index, "name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Depends on Bill Templates</Label>
                  <div className="flex flex-wrap gap-2">
                    {createdBillTemplateIds.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No bill templates created. Go back to create bill templates first.
                      </p>
                    ) : (
                      createdBillTemplateIds.map((billTemplateId, idx) => {
                        // Find the corresponding bill template by index
                        const billTemplate = billTemplates.find((_, i) => {
                          // Match by position in the array
                          return i === idx
                        })
                        const isSelected = template.dependsOnBillTemplateIds.includes(billTemplateId)
                        return (
                          <Badge
                            key={billTemplateId}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              const updated = isSelected
                                ? template.dependsOnBillTemplateIds.filter((id) => id !== billTemplateId)
                                : [...template.dependsOnBillTemplateIds, billTemplateId]
                              updatePayableTemplate(index, "dependsOnBillTemplateIds", updated)
                            }}
                          >
                            {billTemplate?.name || `Bill Template ${idx + 1}`}
                          </Badge>
                        )
                      })
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Select which bill templates must arrive before generating this payable
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Scheduled Payment Day (Optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 15 for 15th of each month"
                    value={template.scheduledDayOfMonth || ""}
                    onChange={(e) =>
                      updatePayableTemplate(
                        index,
                        "scheduledDayOfMonth",
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addPayableTemplate} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Payable Template
            </Button>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep("bills")}
                disabled={loading}
              >
                Back
              </Button>
              <Button variant="outline" onClick={handleSkip} disabled={loading}>
                Skip for Now
              </Button>
              <Button onClick={handleSavePayableTemplates} disabled={loading}>
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

