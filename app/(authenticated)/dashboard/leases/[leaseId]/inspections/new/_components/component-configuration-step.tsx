"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import { ComponentConfiguration, getItemsForComponentsAction } from "@/actions/moving-inspections-actions"
import { getMovingInspectionCategoriesAction } from "@/actions/moving-inspections-actions"
import { toast } from "sonner"

interface ComponentConfigurationStepProps {
  onComplete: (config: ComponentConfiguration, items: Array<{
    categoryName: string
    items: Array<{ name: string; displayOrder: number; roomInstanceNumber?: number }>
  }>) => void
  initialConfig?: ComponentConfiguration
}

// Category configuration mapping
const CATEGORY_CONFIG = [
  { key: "motorGate" as const, label: "Motor Gate", defaultCount: 1 },
  { key: "entranceHall" as const, label: "Entrance Hall", defaultCount: 1 },
  { key: "lounge" as const, label: "Lounge", defaultCount: 1 },
  { key: "diningRoom" as const, label: "Dining Room", defaultCount: 0 },
  { key: "familyRoom" as const, label: "Family Room", defaultCount: 0 },
  { key: "passageStairs" as const, label: "Passage / Stairs", defaultCount: 1 },
  { key: "kitchenScullery" as const, label: "Kitchen & Scullery", defaultCount: 1 },
  { key: "pantry" as const, label: "Pantry", defaultCount: 0 },
  { key: "bedrooms" as const, label: "Bedrooms", defaultCount: 2 },
  { key: "bathrooms" as const, label: "Bathrooms", defaultCount: 2 },
  { key: "garages" as const, label: "Garages", defaultCount: 0 },
  { key: "pool" as const, label: "Pool", defaultCount: 0 },
  { key: "patioBalcony" as const, label: "Patio / Balcony", defaultCount: 0 },
  { key: "garden" as const, label: "Garden", defaultCount: 0 },
  { key: "general" as const, label: "General", defaultCount: 1 },
  { key: "other" as const, label: "Other", defaultCount: 0 }
]

export function ComponentConfigurationStep({
  onComplete,
  initialConfig
}: ComponentConfigurationStepProps) {
  const [config, setConfig] = useState<ComponentConfiguration>(() => {
    // Initialize with defaults if not provided
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      return initialConfig
    }
    const defaults: ComponentConfiguration = {}
    CATEGORY_CONFIG.forEach(cat => {
      defaults[cat.key] = cat.defaultCount
    })
    return defaults
  })
  const [loading, setLoading] = useState(false)

  const updateConfig = (key: keyof ComponentConfiguration, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = async () => {
    setLoading(true)
    try {
      const result = await getItemsForComponentsAction(config)
      if (!result.isSuccess) {
        toast.error(result.message)
        return
      }

      onComplete(config, result.data || [])
    } catch (error) {
      console.error("Error getting items:", error)
      toast.error("Failed to get items for components")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 1: Configure Property Components</h2>
        <p className="text-muted-foreground">
          Specify the components and features of this property. The inspection form will be pre-populated based on your selections.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Room Types & Areas</CardTitle>
          <CardDescription>Specify the number of each room type or area. Set to 0 to exclude.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORY_CONFIG.map((category) => (
              <div key={category.key} className="space-y-2">
                <Label htmlFor={category.key}>{category.label}</Label>
                <Input
                  id={category.key}
                  type="number"
                  min="0"
                  value={config[category.key] || 0}
                  onChange={(e) => updateConfig(category.key, parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={loading}>
          Next: Review Items
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
