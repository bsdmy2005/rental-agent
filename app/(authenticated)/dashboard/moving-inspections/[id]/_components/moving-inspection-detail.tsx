"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { InspectionChecklist } from "../../_components/inspection-checklist"
import { format } from "date-fns"

interface MovingInspectionDetailProps {
  inspection: {
    id: string
    inspectionType: "moving_in" | "moving_out"
    status: "draft" | "in_progress" | "completed" | "signed"
    createdAt: Date
    items: Array<{
      id: string
      name: string
      condition: "good" | "fair" | "poor" | "defective"
      notes: string | null
      category: {
        name: string
        displayOrder: number
      }
      defects: Array<{
        id: string
        description: string
        severity: "minor" | "moderate" | "major"
      }>
    }>
  }
}

export function MovingInspectionDetail({ inspection }: MovingInspectionDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "bg-green-500"
      case "completed":
        return "bg-blue-500"
      case "in_progress":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeLabel = (type: string) => {
    return type === "moving_in" ? "Moving In" : "Moving Out"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/moving-inspections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{getTypeLabel(inspection.inspectionType)} Inspection</h1>
          <p className="text-muted-foreground">
            Created: {format(new Date(inspection.createdAt), "PPP")}
          </p>
        </div>
        <Badge className={getStatusColor(inspection.status)}>
          {inspection.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Checklist</CardTitle>
          <CardDescription>
            Review and update items for this inspection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InspectionChecklist inspectionId={inspection.id} items={inspection.items} />
        </CardContent>
      </Card>
    </div>
  )
}

