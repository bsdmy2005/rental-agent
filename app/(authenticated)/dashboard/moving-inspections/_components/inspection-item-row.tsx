"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { DefectForm } from "./defect-form"

interface InspectionItemRowProps {
  inspectionId: string
  item: {
    id: string
    name: string
    condition: "good" | "fair" | "poor" | "defective"
    notes: string | null
    defects: Array<{
      id: string
      description: string
      severity: "minor" | "moderate" | "major"
    }>
  }
}

export function InspectionItemRow({ inspectionId, item }: InspectionItemRowProps) {
  const [showDefects, setShowDefects] = useState(false)

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "good":
        return "bg-green-500"
      case "fair":
        return "bg-yellow-500"
      case "poor":
        return "bg-orange-500"
      case "defective":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            <Badge className={getConditionColor(item.condition)}>
              {item.condition}
            </Badge>
          </div>
          {item.notes && (
            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
          )}
        </div>
        {item.condition === "defective" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDefects(!showDefects)}
          >
            {showDefects ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {showDefects && (
        <div className="mt-4 space-y-2">
          {item.defects.map((defect) => (
            <div key={defect.id} className="bg-muted p-2 rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm">{defect.description}</span>
                <Badge variant="outline">{defect.severity}</Badge>
              </div>
            </div>
          ))}
          <DefectForm itemId={item.id} inspectionId={inspectionId} />
        </div>
      )}
    </div>
  )
}

