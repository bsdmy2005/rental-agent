"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createBillingScheduleAction,
  updateBillingScheduleAction
} from "@/actions/billing-schedules-actions"
import { toast } from "sonner"
import type { SelectBillingSchedule } from "@/db/schema"
import { X, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface ScheduleFormProps {
  propertyId: string
  scheduleType: "bill_input" | "invoice_output" | "payable_output"
  initialSchedule?: SelectBillingSchedule
  onSuccess: () => void
  onCancel: () => void
}

export function ScheduleForm({
  propertyId,
  scheduleType,
  initialSchedule,
  onSuccess,
  onCancel
}: ScheduleFormProps) {
  const [loading, setLoading] = useState(false)
  const [rules, setRules] = useState<Array<{ id: string; name: string; billType: string }>>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [billSchedules, setBillSchedules] = useState<Array<{ id: string; billType: string | null; name: string }>>([])
  const [formData, setFormData] = useState({
    billType: initialSchedule?.billType || "",
    source: (initialSchedule?.source as "manual_upload" | "email" | "agentic") || "manual_upload",
    frequency: initialSchedule?.frequency || "monthly",
    expectedDayOfMonth: initialSchedule?.expectedDayOfMonth || 1,
    expectedDayOfWeek: initialSchedule?.expectedDayOfWeek || 0,
    extractionRuleId: initialSchedule?.extractionRuleId || "none",
    emailFilterFrom: (initialSchedule?.emailFilter as { from?: string })?.from || "",
    emailFilterSubject: (initialSchedule?.emailFilter as { subject?: string })?.subject || "",
    isActive: initialSchedule?.isActive ?? true,
    waitForBills: initialSchedule?.waitForBills ?? false,
    dependsOnBillSchedules: (initialSchedule?.dependsOnBillSchedules as string[] | null) || []
  })

  // Load extraction rules for bill input schedules
  useEffect(() => {
    if (scheduleType === "bill_input" && formData.billType) {
      loadRules()
    } else {
      // Clear rules if not bill_input or no billType
      setRules([])
      setRulesLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleType, formData.billType, propertyId])

  // Load rules on initial mount if editing and billType is already set
  useEffect(() => {
    if (
      scheduleType === "bill_input" &&
      initialSchedule?.billType &&
      !rulesLoading &&
      rules.length === 0
    ) {
      // Small delay to ensure formData is initialized
      const timer = setTimeout(() => {
        if (formData.billType === initialSchedule.billType) {
          loadRules()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load bill schedules for dependency configuration (invoice/payable outputs)
  useEffect(() => {
    if (scheduleType === "invoice_output" || scheduleType === "payable_output") {
      loadBillSchedules()
    }
  }, [scheduleType, propertyId])

  const loadRules = async () => {
    if (!formData.billType) {
      setRules([])
      return
    }

    setRulesLoading(true)
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(
        `/api/bills/rules?propertyId=${propertyId}&billType=${formData.billType}&_t=${Date.now()}`
      )
      if (response.ok) {
        const data = await response.json()
        const formattedRules = (data.rules || []).map((r: { id: string; name: string }) => ({
          id: r.id,
          name: r.name,
          billType: formData.billType
        }))
        setRules(formattedRules)
        
        // If no rules found, log for debugging
        if (formattedRules.length === 0) {
          console.warn(`No extraction rules found for property ${propertyId} and bill type ${formData.billType}`)
        }
      } else {
        console.error("Failed to load rules:", response.status, response.statusText)
        setRules([])
      }
    } catch (error) {
      console.error("Error loading rules:", error)
      setRules([])
    } finally {
      setRulesLoading(false)
    }
  }

  const loadBillSchedules = async () => {
    try {
      const response = await fetch(`/api/billing-schedules?propertyId=${propertyId}`)
      if (response.ok) {
        const data = await response.json()
        const billInputSchedules = (data.schedules || []).filter(
          (s: any) => s.scheduleType === "bill_input"
        )
        setBillSchedules(
          billInputSchedules.map((s: any) => ({
            id: s.id,
            billType: s.billType,
            name: `${s.billType || "Unknown"} Bill Schedule`
          }))
        )
      }
    } catch (error) {
      console.error("Error loading bill schedules:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate billType for bill_input schedules
    if (scheduleType === "bill_input" && !formData.billType) {
      toast.error("Please select a bill type")
      return
    }

    // Validate extraction rule for bill_input schedules
    if (scheduleType === "bill_input" && (!formData.extractionRuleId || formData.extractionRuleId === "none")) {
      toast.error("Please select an extraction rule. Extraction rules are required for bill input schedules.")
      return
    }
    
    setLoading(true)

    try {
      const scheduleData = {
        propertyId,
        scheduleType,
        billType: scheduleType === "bill_input" && formData.billType ? (formData.billType as "municipality" | "levy" | "utility" | "other") : null,
        source: formData.source as "manual_upload" | "email" | "agentic",
        frequency: formData.frequency as "monthly" | "weekly" | "once",
        expectedDayOfMonth:
          formData.frequency === "monthly" ? formData.expectedDayOfMonth : null,
        expectedDayOfWeek: formData.frequency === "weekly" ? formData.expectedDayOfWeek : null,
        extractionRuleId:
          scheduleType === "bill_input" && formData.extractionRuleId
            ? formData.extractionRuleId
            : null,
        emailFilter:
          scheduleType === "bill_input" &&
          formData.source === "email" &&
          (formData.emailFilterFrom || formData.emailFilterSubject)
            ? {
                from: formData.emailFilterFrom || undefined,
                subject: formData.emailFilterSubject || undefined
              }
            : null,
        isActive: formData.isActive,
        waitForBills:
          scheduleType === "invoice_output" || scheduleType === "payable_output"
            ? formData.waitForBills
            : false,
        dependsOnBillSchedules:
          (scheduleType === "invoice_output" || scheduleType === "payable_output") &&
          formData.waitForBills &&
          formData.dependsOnBillSchedules.length > 0
            ? formData.dependsOnBillSchedules
            : null,
        dependencyLogic: null // Future: Add more complex dependency logic configuration
      }

      let result
      if (initialSchedule) {
        result = await updateBillingScheduleAction(initialSchedule.id, scheduleData)
      } else {
        result = await createBillingScheduleAction(scheduleData)
      }

      if (result.isSuccess) {
        toast.success(
          initialSchedule ? "Schedule updated successfully" : "Schedule created successfully"
        )
        onSuccess()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error saving schedule:", error)
      toast.error("Failed to save schedule")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {initialSchedule ? "Edit" : "Create"} {scheduleType === "bill_input" ? "Bill Input" : scheduleType === "invoice_output" ? "Invoice Output" : "Payable Output"} Schedule
            </CardTitle>
            <CardDescription>
              Configure when this schedule should be fulfilled
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {scheduleType === "bill_input" && (
            <div className="space-y-2">
              <Label htmlFor="billType">Bill Type</Label>
              <Select
                value={formData.billType}
                onValueChange={(value) => setFormData({ ...formData, billType: value })}
                required
              >
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
          )}

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) =>
                setFormData({ ...formData, frequency: value as "monthly" | "weekly" | "once" })
              }
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="once">Once</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.frequency === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="expectedDayOfMonth">Expected Day of Month (1-31)</Label>
              <Input
                id="expectedDayOfMonth"
                type="number"
                min="1"
                max="31"
                value={formData.expectedDayOfMonth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedDayOfMonth: parseInt(e.target.value) || 1
                  })
                }
                required
              />
            </div>
          )}

          {formData.frequency === "weekly" && (
            <div className="space-y-2">
              <Label htmlFor="expectedDayOfWeek">Expected Day of Week</Label>
              <Select
                value={formData.expectedDayOfWeek.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, expectedDayOfWeek: parseInt(value) })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {scheduleType === "bill_input" && (
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    source: value as "manual_upload" | "email" | "agentic"
                  })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_upload">Manual Upload</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="agentic">Agentic (Future)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How bills will be received for this schedule
              </p>
            </div>
          )}

          {scheduleType === "bill_input" && formData.billType && (
            <div className="space-y-2">
              <Label htmlFor="extractionRuleId">
                Extraction Rule <span className="text-destructive">*</span>
              </Label>
              {rulesLoading ? (
                <div className="text-sm text-muted-foreground">Loading extraction rules...</div>
              ) : rules.length === 0 ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                  <p className="font-medium">No extraction rules found</p>
                  <p className="text-xs mt-1">
                    You must create an extraction rule for this bill type before setting up a schedule.
                    Go to the Rules section to create one.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.extractionRuleId || ""}
                  onValueChange={(value) => setFormData({ ...formData, extractionRuleId: value })}
                  disabled={rulesLoading}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select extraction rule (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {rules.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                The rule used to extract data from this type of bill. Required for bill input schedules.
                Create extraction rules in the Rules section.
              </p>
            </div>
          )}

          {scheduleType === "bill_input" && formData.source === "email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="emailFilterFrom">Email Filter - From (Optional)</Label>
                <Input
                  id="emailFilterFrom"
                  type="email"
                  placeholder="sender@example.com"
                  value={formData.emailFilterFrom}
                  onChange={(e) => setFormData({ ...formData, emailFilterFrom: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Filter emails by sender address (leave empty to accept from any sender)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailFilterSubject">Email Filter - Subject (Optional)</Label>
                <Input
                  id="emailFilterSubject"
                  type="text"
                  placeholder="Bill Statement"
                  value={formData.emailFilterSubject}
                  onChange={(e) =>
                    setFormData({ ...formData, emailFilterSubject: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Filter emails by subject line pattern (leave empty to accept any subject)
                </p>
              </div>
            </>
          )}

          {/* Dependency Configuration for Invoice/Payable Outputs */}
          {(scheduleType === "invoice_output" || scheduleType === "payable_output") && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2">
                  <Info className="h-4 w-4" /> Dependency Configuration
                </CardTitle>
                <CardDescription>
                  Configure whether this schedule should wait for bills before generating{" "}
                  {scheduleType === "invoice_output" ? "invoices" : "payables"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waitForBills"
                    checked={formData.waitForBills}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, waitForBills: checked as boolean })
                    }
                  />
                  <Label htmlFor="waitForBills" className="cursor-pointer">
                    Wait for bills before generating{" "}
                    {scheduleType === "invoice_output" ? "invoices" : "payables"}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  If enabled, this schedule will wait for all dependent bill schedules to be
                  fulfilled before generating {scheduleType === "invoice_output" ? "invoices" : "payables"}.
                  This is typically used for postpaid properties.
                </p>

                {formData.waitForBills && (
                  <div className="space-y-2">
                    <Label>Dependent Bill Schedules (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Select which bill schedules this depends on. If none selected, it will wait
                      for all bill schedules.
                    </p>
                    {billSchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No bill input schedules found. Create bill schedules first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {billSchedules.map((schedule) => (
                          <div key={schedule.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`depends-${schedule.id}`}
                              checked={formData.dependsOnBillSchedules.includes(schedule.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({
                                    ...formData,
                                    dependsOnBillSchedules: [
                                      ...formData.dependsOnBillSchedules,
                                      schedule.id
                                    ]
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    dependsOnBillSchedules: formData.dependsOnBillSchedules.filter(
                                      (id) => id !== schedule.id
                                    )
                                  })
                                }
                              }}
                            />
                            <Label
                              htmlFor={`depends-${schedule.id}`}
                              className="cursor-pointer font-normal"
                            >
                              {schedule.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked as boolean })
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active
            </Label>
            <p className="text-xs text-muted-foreground">
              Only active schedules are monitored for compliance.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : initialSchedule ? "Update" : "Create"} Schedule
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

