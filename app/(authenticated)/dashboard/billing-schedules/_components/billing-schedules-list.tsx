"use server"

import { currentUser } from "@clerk/nextjs/server"
import { getUserProfileByClerkIdQuery } from "@/queries/user-profiles-queries"
import { getLandlordByUserProfileIdQuery } from "@/queries/landlords-queries"
import { getPropertiesByLandlordIdQuery, getPropertiesForUserQuery, getPropertyByIdQuery } from "@/queries/properties-queries"
import { getBillingSchedulesForUserPropertiesQuery } from "@/queries/billing-schedules-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, ArrowRight, Calendar } from "lucide-react"
import { getScheduleStatusesForPropertiesAction } from "@/actions/billing-schedule-status-actions"
import { type SelectBillingScheduleStatus } from "@/db/schema"

export async function BillingSchedulesList() {
  const user = await currentUser()
  if (!user) {
    return <div>Not authenticated</div>
  }

  const userProfile = await getUserProfileByClerkIdQuery(user.id)
  if (!userProfile) {
    return <div>User profile not found</div>
  }

  // Get properties based on user type
  let properties: Array<{ id: string; name: string }> = []

  if (userProfile.userType === "landlord") {
    const landlord = await getLandlordByUserProfileIdQuery(userProfile.id)
    if (landlord) {
      const landlordProperties = await getPropertiesByLandlordIdQuery(landlord.id)
      properties = landlordProperties.map((p) => ({ id: p.id, name: p.name }))
    }
  } else if (userProfile.userType === "rental_agent") {
    const agentProperties = await getPropertiesForUserQuery(userProfile.id, userProfile.userType)
    properties = agentProperties.map((p) => ({ id: p.id, name: p.name }))
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No properties found.</p>
          <p className="text-muted-foreground text-sm mb-4">
            Create a property first to set up billing schedules.
          </p>
          <Button asChild>
            <Link href="/dashboard/properties/add">Add Property</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Get all billing schedules for user's properties
  const propertyIds = properties.map((p) => p.id)
  const allSchedules = await getBillingSchedulesForUserPropertiesQuery(propertyIds)

  // Get current period for status checking
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Group schedules by property
  const schedulesByProperty = new Map<string, typeof allSchedules>()
  for (const schedule of allSchedules) {
    if (!schedulesByProperty.has(schedule.propertyId)) {
      schedulesByProperty.set(schedule.propertyId, [])
    }
    schedulesByProperty.get(schedule.propertyId)!.push(schedule)
  }

  // Batch fetch statuses for all properties at once (fixes N+1 query problem)
  const propertyIdsWithSchedules = Array.from(schedulesByProperty.keys())
  const statusesResult = await getScheduleStatusesForPropertiesAction(
    propertyIdsWithSchedules,
    currentYear,
    currentMonth
  )
  const statusesByPropertyMap = statusesResult.isSuccess ? statusesResult.data : new Map()

  // Map properties with schedules
  const propertiesWithSchedules = Array.from(schedulesByProperty.entries()).map(([propertyId, schedules]) => {
    const property = properties.find((p) => p.id === propertyId) || { id: propertyId, name: "Unknown Property" }
    const statuses = statusesByPropertyMap.get(propertyId) || []

    return {
      property,
      schedules,
      statuses
    }
  })

  // Properties without schedules
  const propertiesWithoutSchedules = properties.filter(
    (p) => !schedulesByProperty.has(p.id)
  )

  return (
    <div className="space-y-6">
      {propertiesWithSchedules.map(({ property, schedules, statuses }) => {
        // Count schedules by type
        const billInputCount = schedules.filter((s) => s.scheduleType === "bill_input").length
        const invoiceOutputCount = schedules.filter((s) => s.scheduleType === "invoice_output").length
        const payableOutputCount = schedules.filter((s) => s.scheduleType === "payable_output").length

        // Count late/missed schedules
        const lateCount = statuses.filter(
          (s: SelectBillingScheduleStatus) => s.status === "late" || s.status === "missed"
        ).length

        return (
          <Card key={property.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="text-primary hover:underline"
                    >
                      {property.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} configured
                    {lateCount > 0 && (
                      <span className="text-destructive ml-2">
                        • {lateCount} late/missed
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/properties/${property.id}/billing-schedule`}>
                    Manage Schedules
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Schedule Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Bill Inputs</p>
                        <p className="text-2xl font-bold mt-1">{billInputCount}</p>
                      </div>
                      <Badge variant="outline">{billInputCount > 0 ? "Active" : "None"}</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Invoice Outputs</p>
                        <p className="text-2xl font-bold mt-1">{invoiceOutputCount}</p>
                      </div>
                      <Badge variant="outline">{invoiceOutputCount > 0 ? "Active" : "None"}</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Payable Outputs</p>
                        <p className="text-2xl font-bold mt-1">{payableOutputCount}</p>
                      </div>
                      <Badge variant="outline">{payableOutputCount > 0 ? "Active" : "None"}</Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Schedule List */}
                {schedules.length > 0 && (
                  <div className="rounded-md border">
                    <div className="divide-y">
                      {schedules.slice(0, 5).map((schedule) => {
                        const status = statuses.find(
                          (s: SelectBillingScheduleStatus) =>
                            s.scheduleId === schedule.id &&
                            s.periodYear === currentYear &&
                            s.periodMonth === currentMonth
                        )

                        const getScheduleLabel = () => {
                          if (schedule.scheduleType === "bill_input") {
                            return `${schedule.billType || "Unknown"} Bill Input`
                          } else if (schedule.scheduleType === "invoice_output") {
                            return "Invoice Output"
                          } else {
                            return "Payable Output"
                          }
                        }

                        const getStatusBadge = () => {
                          if (!status) {
                            return <Badge variant="secondary">pending</Badge>
                          }
                          switch (status.status) {
                            case "on_time":
                              return <Badge className="bg-green-600 text-white">on time</Badge>
                            case "late":
                              return (
                                <Badge className="bg-yellow-600 text-white">
                                  late ({status.daysLate} days)
                                </Badge>
                              )
                            case "missed":
                              return <Badge variant="destructive">missed</Badge>
                            case "blocked":
                              return (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  blocked
                                </Badge>
                              )
                            default:
                              return <Badge variant="secondary">pending</Badge>
                          }
                        }

                        return (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-3 hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium text-sm">{getScheduleLabel()}</p>
                                <p className="text-xs text-muted-foreground">
                                  {schedule.frequency} • {schedule.expectedDayOfMonth ? `Day ${schedule.expectedDayOfMonth}` : schedule.expectedDayOfWeek !== null ? `Week ${schedule.expectedDayOfWeek}` : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {schedules.length > 5 && (
                      <div className="p-3 text-center border-t">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/properties/${property.id}/billing-schedule`}>
                            View all {schedules.length} schedules
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Properties without schedules */}
      {propertiesWithoutSchedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Properties Without Schedules</CardTitle>
            <CardDescription>
              Set up billing schedules for these properties to automate bill processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {propertiesWithoutSchedules.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50"
                >
                  <div>
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {property.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">No billing schedules configured</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/properties/${property.id}/billing-schedule`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Set Up Schedules
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

