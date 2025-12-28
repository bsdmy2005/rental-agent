"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface MovingInspectionsListClientProps {
  inspections: Array<{
    id: string
    inspectionType: "moving_in" | "moving_out"
    status: "draft" | "in_progress" | "completed" | "signed"
    createdAt: Date
    leaseAgreement: {
      tenant: {
        name: string
      }
      property: {
        name: string
      }
    }
  }>
}

export function MovingInspectionsListClient({ inspections }: MovingInspectionsListClientProps) {
  if (inspections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No moving inspections found.</p>
        <p className="text-muted-foreground text-sm">Create your first inspection to get started.</p>
      </div>
    )
  }

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
    <div className="space-y-4">
      {inspections.map((inspection) => (
        <Link key={inspection.id} href={`/dashboard/moving-inspections/${inspection.id}`}>
          <Card className="hover:bg-accent transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {getTypeLabel(inspection.inspectionType)} - {inspection.leaseAgreement.property.name}
                </CardTitle>
                <Badge className={getStatusColor(inspection.status)}>
                  {inspection.status}
                </Badge>
              </div>
              <CardDescription>
                Tenant: {inspection.leaseAgreement.tenant.name} • Created:{" "}
                {format(new Date(inspection.createdAt), "PPP")}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}

