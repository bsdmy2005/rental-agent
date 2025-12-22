"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SelectBillTemplate, SelectPayableTemplate, SelectRentalInvoiceTemplate, SelectBillArrivalSchedule, SelectPayableSchedule } from "@/db/schema"
import { Calendar } from "lucide-react"

interface BillingOverviewProps {
  propertyId: string
  billTemplates: SelectBillTemplate[]
  payableTemplates: SelectPayableTemplate[]
  invoiceTemplates: SelectRentalInvoiceTemplate[]
  billArrivalSchedules: SelectBillArrivalSchedule[]
  payableSchedules: SelectPayableSchedule[]
}

export function BillingOverview({
  propertyId,
  billTemplates,
  payableTemplates,
  invoiceTemplates,
  billArrivalSchedules,
  payableSchedules
}: BillingOverviewProps) {
  // Create maps for quick lookup
  const billScheduleMap = new Map(
    billArrivalSchedules.map((schedule) => [schedule.billTemplateId, schedule])
  )
  const payableScheduleMap = new Map(
    payableSchedules.map((schedule) => [schedule.payableTemplateId, schedule])
  )
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bill Templates</CardTitle>
            <CardDescription>Expected input document types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billTemplates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {billTemplates.filter((t) => t.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payable Templates</CardTitle>
            <CardDescription>Landlord payment types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payableTemplates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {payableTemplates.filter((t) => t.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Templates</CardTitle>
            <CardDescription>Tenant invoice types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceTemplates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceTemplates.filter((t) => t.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Templates</CardTitle>
          <CardDescription>List of bill templates for this property</CardDescription>
        </CardHeader>
        <CardContent>
          {billTemplates.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bill templates created yet</p>
          ) : (
            <div className="space-y-2">
              {billTemplates.map((template) => {
                const schedule = billScheduleMap.get(template.id)
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        <span>{template.billType}</span>
                        {schedule && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expected arrival: Day {schedule.expectedDayOfMonth} of each month
                          </span>
                        )}
                        {!schedule && (
                          <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                            No schedule configured
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payable Templates</CardTitle>
          <CardDescription>List of payable templates for this property</CardDescription>
        </CardHeader>
        <CardContent>
          {payableTemplates.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payable templates created yet</p>
          ) : (
            <div className="space-y-2">
              {payableTemplates.map((template) => {
                const schedule = payableScheduleMap.get(template.id)
                return (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                        {template.description && <span>{template.description}</span>}
                        {schedule && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Scheduled payment: Day {schedule.scheduledDayOfMonth} of each month
                          </span>
                        )}
                        {!schedule && (
                          <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                            No schedule configured
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Templates</CardTitle>
          <CardDescription>List of invoice templates for this property</CardDescription>
        </CardHeader>
        <CardContent>
          {invoiceTemplates.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoice templates created yet</p>
          ) : (
            <div className="space-y-2">
              {invoiceTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">Tenant Invoice</div>
                    <div className="text-sm text-muted-foreground">
                      Generation day: {template.generationDayOfMonth}
                    </div>
                  </div>
                  <Badge variant={template.isActive ? "default" : "secondary"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

