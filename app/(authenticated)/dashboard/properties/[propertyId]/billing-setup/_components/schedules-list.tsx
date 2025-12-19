"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import type { SelectBillingSchedule, SelectBillingScheduleStatus } from "@/db/schema"
import { ScheduleForm } from "./schedule-form"
import {
  deleteBillingScheduleAction,
  getBillingSchedulesForPropertyAction
} from "@/actions/billing-schedules-actions"
import { toast } from "sonner"
import { calculateExpectedDate } from "@/lib/billing-schedule-compliance"

interface BillingSchedulesListProps {
  propertyId: string
  schedules: SelectBillingSchedule[]
  statuses: SelectBillingScheduleStatus[]
  currentYear: number
  currentMonth: number
}

export function BillingSchedulesList({
  propertyId,
  schedules: initialSchedules,
  statuses,
  currentYear,
  currentMonth
}: BillingSchedulesListProps) {
  const [schedules, setSchedules] = useState(initialSchedules)
  const [editingSchedule, setEditingSchedule] = useState<SelectBillingSchedule | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<
    "bill_input" | "invoice_output" | "payable_output" | null
  >(null)

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return
    }

    const result = await deleteBillingScheduleAction(scheduleId)
    if (result.isSuccess) {
      toast.success("Schedule deleted successfully")
      // Refresh schedules
      const refreshResult = await getBillingSchedulesForPropertyAction(propertyId)
      if (refreshResult.isSuccess) {
        setSchedules(refreshResult.data)
      }
    } else {
      toast.error(result.message)
    }
  }

  const handleFormSuccess = async () => {
    setShowForm(false)
    setEditingSchedule(null)
    setFormType(null)
    // Refresh schedules
    const refreshResult = await getBillingSchedulesForPropertyAction(propertyId)
    if (refreshResult.isSuccess) {
      setSchedules(refreshResult.data)
    }
  }

  const handleEdit = (schedule: SelectBillingSchedule) => {
    setEditingSchedule(schedule)
    setFormType(schedule.scheduleType)
    setShowForm(true)
  }

  const handleAdd = (type: "bill_input" | "invoice_output" | "payable_output") => {
    setEditingSchedule(null)
    setFormType(type)
    setShowForm(true)
  }

  // Group schedules by type
  const billInputSchedules = schedules.filter((s) => s.scheduleType === "bill_input")
  const invoiceOutputSchedules = schedules.filter((s) => s.scheduleType === "invoice_output")
  const payableOutputSchedules = schedules.filter((s) => s.scheduleType === "payable_output")

  // Get current period status for a schedule
  const getCurrentStatus = (scheduleId: string) => {
    return statuses.find(
      (s) =>
        s.scheduleId === scheduleId &&
        s.periodYear === currentYear &&
        s.periodMonth === currentMonth
    )
  }

  const getStatusBadge = (status: SelectBillingScheduleStatus | undefined) => {
    if (!status) {
      const schedule = schedules.find((s) => s.id === status?.scheduleId)
      if (schedule) {
        const expectedDate = calculateExpectedDate(schedule, currentYear, currentMonth)
        if (new Date() > expectedDate) {
          return <Badge variant="destructive">missed</Badge>
        }
      }
      return <Badge variant="secondary">pending</Badge>
    }

    switch (status.status) {
      case "on_time":
        return (
          <Badge className="bg-green-600 text-white dark:bg-green-700">on time</Badge>
        )
      case "late":
        return (
          <Badge className="bg-yellow-600 text-white dark:bg-yellow-700">
            late ({status.daysLate} days)
          </Badge>
        )
      case "missed":
        return <Badge variant="destructive">missed</Badge>
      case "blocked":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300">
            blocked
          </Badge>
        )
      default:
        return <Badge variant="secondary">pending</Badge>
    }
  }

  if (showForm) {
    return (
      <ScheduleForm
        propertyId={propertyId}
        initialSchedule={editingSchedule || undefined}
        scheduleType={formType!}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false)
          setEditingSchedule(null)
          setFormType(null)
        }}
      />
    )
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "email":
        return <Badge variant="outline" className="text-xs">Email</Badge>
      case "manual_upload":
        return <Badge variant="outline" className="text-xs">Manual</Badge>
      case "agentic":
        return <Badge variant="outline" className="text-xs">Agentic</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{source}</Badge>
    }
  }

  const formatNextDate = (nextDate: Date | null | undefined) => {
    if (!nextDate) return <span className="text-muted-foreground text-sm">Not set</span>
    
    const date = new Date(nextDate)
    // Validate date is valid
    if (isNaN(date.getTime())) {
      return <span className="text-muted-foreground text-sm">Invalid date</span>
    }
    
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })

    if (diffDays < 0) {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-red-600 dark:text-red-400">{dateStr}</span>
          <span className="text-xs text-red-500">Overdue by {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? "s" : ""}</span>
        </div>
      )
    } else if (diffDays === 0) {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{dateStr}</span>
          <span className="text-xs text-yellow-500">Today</span>
        </div>
      )
    } else if (diffDays === 1) {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{dateStr}</span>
          <span className="text-xs text-muted-foreground">Tomorrow</span>
        </div>
      )
    } else if (diffDays <= 7) {
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{dateStr}</span>
          <span className="text-xs text-muted-foreground">In {diffDays} days</span>
        </div>
      )
    } else {
      return <span className="text-sm">{dateStr}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Bill Input Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Input Bills</CardTitle>
              <CardDescription>
                Schedules for bills expected to arrive (municipality, levy, utility, other)
              </CardDescription>
            </div>
            <Button onClick={() => handleAdd("bill_input")} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Bill Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {billInputSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bill input schedules configured</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Bill Type
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Source
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Frequency
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Expected Day
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Next Expected Date
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Status
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {billInputSchedules.map((schedule) => {
                    const currentStatus = getCurrentStatus(schedule.id)
                    const expectedDate = calculateExpectedDate(schedule, currentYear, currentMonth)
                    return (
                      <tr key={schedule.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <span className="font-medium capitalize">{schedule.billType}</span>
                        </td>
                        <td className="p-4">{getSourceBadge(schedule.source)}</td>
                        <td className="p-4 text-sm capitalize">{schedule.frequency}</td>
                        <td className="p-4 text-sm">
                          {schedule.expectedDayOfMonth
                            ? `Day ${schedule.expectedDayOfMonth}`
                            : schedule.expectedDayOfWeek !== null
                              ? `Week ${schedule.expectedDayOfWeek}`
                              : "N/A"}
                        </td>
                        <td className="p-4">{formatNextDate(schedule.nextExpectedDate)}</td>
                        <td className="p-4">{getStatusBadge(currentStatus)}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(schedule)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(schedule.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Output Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Output Invoices</CardTitle>
              <CardDescription>
                Schedule for when invoices should be sent to tenants
              </CardDescription>
            </div>
            <Button
              onClick={() => handleAdd("invoice_output")}
              size="sm"
              disabled={invoiceOutputSchedules.length > 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Invoice Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invoiceOutputSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoice output schedule configured</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Type
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Frequency
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Expected Day
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Next Expected Date
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Dependencies
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Status
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOutputSchedules.map((schedule) => {
                    const currentStatus = getCurrentStatus(schedule.id)
                    return (
                      <tr key={schedule.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <span className="font-medium">Invoice Output</span>
                        </td>
                        <td className="p-4 text-sm capitalize">{schedule.frequency}</td>
                        <td className="p-4 text-sm">
                          {schedule.expectedDayOfMonth
                            ? `Day ${schedule.expectedDayOfMonth}`
                            : schedule.expectedDayOfWeek !== null
                              ? `Week ${schedule.expectedDayOfWeek}`
                              : "N/A"}
                        </td>
                        <td className="p-4">{formatNextDate(schedule.nextExpectedDate)}</td>
                        <td className="p-4">
                          {schedule.waitForBills ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Waits for bills
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(currentStatus)}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(schedule)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(schedule.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payable Output Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Output Payables</CardTitle>
              <CardDescription>
                Schedule for when payables should be processed
              </CardDescription>
            </div>
            <Button
              onClick={() => handleAdd("payable_output")}
              size="sm"
              disabled={payableOutputSchedules.length > 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Payable Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payableOutputSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payable output schedule configured</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Type
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Frequency
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Expected Day
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Next Expected Date
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Dependencies
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                      Status
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payableOutputSchedules.map((schedule) => {
                    const currentStatus = getCurrentStatus(schedule.id)
                    return (
                      <tr key={schedule.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <span className="font-medium">Payable Output</span>
                        </td>
                        <td className="p-4 text-sm capitalize">{schedule.frequency}</td>
                        <td className="p-4 text-sm">
                          {schedule.expectedDayOfMonth
                            ? `Day ${schedule.expectedDayOfMonth}`
                            : schedule.expectedDayOfWeek !== null
                              ? `Week ${schedule.expectedDayOfWeek}`
                              : "N/A"}
                        </td>
                        <td className="p-4">{formatNextDate(schedule.nextExpectedDate)}</td>
                        <td className="p-4">
                          {schedule.waitForBills ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Waits for bills
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(currentStatus)}</td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(schedule)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(schedule.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

