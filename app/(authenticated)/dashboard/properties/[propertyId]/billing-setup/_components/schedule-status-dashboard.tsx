"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SelectBillingSchedule, SelectBillingScheduleStatus } from "@/db/schema"
import { AlertCircle, CheckCircle2, Clock, XCircle, Ban } from "lucide-react"
import { calculateExpectedDate } from "@/lib/billing-schedule-compliance"

interface ScheduleStatusDashboardProps {
  propertyId: string
  schedules: SelectBillingSchedule[]
  statuses: SelectBillingScheduleStatus[]
  currentYear: number
  currentMonth: number
}

export function ScheduleStatusDashboard({
  schedules,
  statuses,
  currentYear,
  currentMonth
}: ScheduleStatusDashboardProps) {
  // Group statuses by schedule
  const statusesBySchedule = new Map<string, SelectBillingScheduleStatus[]>()
  statuses.forEach((status) => {
    const existing = statusesBySchedule.get(status.scheduleId) || []
    existing.push(status)
    statusesBySchedule.set(status.scheduleId, existing)
  })

  // Get current period statuses
  const currentPeriodStatuses = statuses.filter(
    (s) => s.periodYear === currentYear && s.periodMonth === currentMonth
  )

  // Count statuses by type
  const onTimeCount = currentPeriodStatuses.filter((s) => s.status === "on_time").length
  const lateCount = currentPeriodStatuses.filter((s) => s.status === "late").length
  const missedCount = currentPeriodStatuses.filter((s) => s.status === "missed").length
  const pendingCount = currentPeriodStatuses.filter((s) => s.status === "pending").length
  const blockedCount = currentPeriodStatuses.filter((s) => s.status === "blocked").length

  // Find late/blocked schedules
  const lateSchedules = schedules.filter((schedule) => {
    const status = currentPeriodStatuses.find((s) => s.scheduleId === schedule.id)
    return status && (status.status === "late" || status.status === "missed" || status.status === "blocked")
  })

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">On Time</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{onTimeCount}</div>
          <p className="text-xs text-muted-foreground">Schedules fulfilled on time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Late</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lateCount}</div>
          <p className="text-xs text-muted-foreground">Schedules fulfilled late</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Missed</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{missedCount}</div>
          <p className="text-xs text-muted-foreground">Schedules not fulfilled</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">Awaiting fulfillment</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          <Ban className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{blockedCount}</div>
          <p className="text-xs text-muted-foreground">Waiting for dependencies</p>
        </CardContent>
      </Card>

      {lateSchedules.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg">Late Schedules</CardTitle>
            <CardDescription>These schedules need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lateSchedules.map((schedule) => {
                const status = currentPeriodStatuses.find((s) => s.scheduleId === schedule.id)
                const expectedDate = calculateExpectedDate(schedule, currentYear, currentMonth)
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">
                        {schedule.scheduleType === "bill_input"
                          ? `${schedule.billType} Bill`
                          : schedule.scheduleType === "invoice_output"
                            ? "Invoice Output"
                            : "Payable Output"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expected: {expectedDate.toLocaleDateString()}
                        {status?.daysLate && status.daysLate > 0 && (
                          <span className="ml-2 text-yellow-600">
                            ({status.daysLate} days late)
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        status?.status === "missed"
                          ? "destructive"
                          : status?.status === "blocked"
                            ? "outline"
                            : status?.status === "late"
                              ? "outline"
                              : "secondary"
                      }
                      className={
                        status?.status === "blocked"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300"
                          : status?.status === "late"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300"
                            : ""
                      }
                    >
                      {status?.status || "pending"}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

