"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InspectionItemRow } from "./inspection-item-row"

interface InspectionChecklistProps {
  inspectionId: string
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

export function InspectionChecklist({ inspectionId, items }: InspectionChecklistProps) {
  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const categoryName = item.category.name
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, typeof items>)

  const categories = Object.keys(itemsByCategory).sort((a, b) => {
    const aOrder = items.find((i) => i.category.name === a)?.category.displayOrder || 0
    const bOrder = items.find((i) => i.category.name === b)?.category.displayOrder || 0
    return aOrder - bOrder
  })

  return (
    <div className="space-y-6">
      {categories.map((categoryName) => (
        <Card key={categoryName}>
          <CardHeader>
            <CardTitle>{categoryName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {itemsByCategory[categoryName].map((item) => (
                <InspectionItemRow
                  key={item.id}
                  item={item}
                  inspectionId={inspectionId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

