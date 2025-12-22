"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { generatePayablePeriodsForTemplatesAction } from "@/actions/billing-periods-actions"
import { toast } from "sonner"
import { Plus, Calendar, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { type SelectPayableTemplate, type SelectPayableSchedule } from "@/db/schema"

interface PayablePeriodGeneratorWizardProps {
  propertyId: string
  payableTemplates: SelectPayableTemplate[]
  payableSchedules: SelectPayableSchedule[]
}

export function PayablePeriodGeneratorWizard({
  propertyId,
  payableTemplates,
  payableSchedules
}: PayablePeriodGeneratorWizardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    startDate: "",
    durationMonths: "24"
  })

  // Create map of templateId -> schedule
  const scheduleMap = useMemo(
    () => new Map(payableSchedules.map((s) => [s.payableTemplateId, s])),
    [payableSchedules]
  )

  // Get active templates with schedules
  const availableTemplates = useMemo(
    () => payableTemplates.filter((t) => t.isActive && scheduleMap.has(t.id)),
    [payableTemplates, scheduleMap]
  )

  const toggleTemplate = useCallback((templateId: string, checked: boolean) => {
    setSelectedTemplates((prev) => {
      // Only create new Set if state actually changes
      const currentlySelected = prev.has(templateId)
      if (checked === currentlySelected) {
        // No change needed, return same Set to prevent re-render
        return prev
      }
      
      const newSelected = new Set(prev)
      if (checked) {
        newSelected.add(templateId)
      } else {
        newSelected.delete(templateId)
      }
      return newSelected
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.startDate) {
        toast.error("Please select a start date")
        setLoading(false)
        return
      }

      if (selectedTemplates.size === 0) {
        toast.error("Please select at least one payable template")
        setLoading(false)
        return
      }

      const startDate = new Date(formData.startDate)
      const durationMonths = parseInt(formData.durationMonths, 10)

      if (isNaN(durationMonths) || durationMonths <= 0) {
        toast.error("Duration must be a positive number")
        setLoading(false)
        return
      }

      // Prepare template configs with payment days
      const templateConfigs = Array.from(selectedTemplates).map((templateId) => {
        const schedule = scheduleMap.get(templateId)
        return {
          templateId,
          paymentDay: schedule?.scheduledDayOfMonth || 1
        }
      })

      const result = await generatePayablePeriodsForTemplatesAction(
        propertyId,
        startDate,
        durationMonths,
        templateConfigs
      )

      if (result.isSuccess) {
        toast.success(`Generated ${result.data?.length || 0} payable periods`)
        setFormData({
          startDate: "",
          durationMonths: "24"
        })
        setSelectedTemplates(new Set(availableTemplates.map((t) => t.id)))
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error generating payable periods:", error)
      toast.error("Failed to generate payable periods")
    } finally {
      setLoading(false)
    }
  }

  if (availableTemplates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate Payable Periods</CardTitle>
          <CardDescription>
            No active payable templates with schedules found. Please create payable templates and schedules first.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Generate Payable Periods</CardTitle>
        </div>
        <CardDescription>
          Select payable templates and specify date range to generate periods. Each template will generate periods based on its scheduled payment day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Select Payable Templates</Label>
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTemplates(new Set(availableTemplates.map((t) => t.id)))}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTemplates(new Set())}
              >
                Deselect All
              </Button>
            </div>
            <div className="space-y-2 border rounded-lg p-4 max-h-64 overflow-y-auto">
              {availableTemplates.map((template) => {
                const schedule = scheduleMap.get(template.id)
                const isSelected = selectedTemplates.has(template.id)
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          toggleTemplate(template.id, checked === true)
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        {schedule && (
                          <div className="text-sm text-muted-foreground">
                            Payment day: {schedule.scheduledDayOfMonth} of each month
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="ml-2">
                        <Check className="h-3 w-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
            {selectedTemplates.size > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedTemplates.size} template{selectedTemplates.size !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

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
              <Label htmlFor="durationMonths">Duration (Months)</Label>
              <Input
                id="durationMonths"
                type="number"
                required
                min="1"
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: e.target.value })}
                className="h-11"
                placeholder="24"
              />
              <p className="text-xs text-muted-foreground">
                Number of months to generate periods for
              </p>
            </div>
          </div>

          <Button type="submit" disabled={loading || selectedTemplates.size === 0} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {loading
              ? "Generating..."
              : `Generate Periods for ${selectedTemplates.size} Template${selectedTemplates.size !== 1 ? "s" : ""}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
