"use client"

import { useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type SelectBillTemplate } from "@/db/schema"

interface TemplateDependencyEditorProps {
  billTemplates: SelectBillTemplate[]
  selectedDependencies: string[]
  onDependenciesChange: (dependencies: string[]) => void
  title?: string
  description?: string
}

export function TemplateDependencyEditor({
  billTemplates,
  selectedDependencies,
  onDependenciesChange,
  title = "Bill Template Dependencies",
  description = "Select which bill templates must arrive before generating invoices/payables"
}: TemplateDependencyEditorProps) {
  const activeBillTemplates = useMemo(() => {
    return billTemplates.filter((bt) => bt.isActive)
  }, [billTemplates])

  const toggleDependency = (billTemplateId: string) => {
    if (selectedDependencies.includes(billTemplateId)) {
      onDependenciesChange(selectedDependencies.filter((id) => id !== billTemplateId))
    } else {
      onDependenciesChange([...selectedDependencies, billTemplateId])
    }
  }

  const getBillTypeColor = (billType: string) => {
    switch (billType) {
      case "municipality":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "levy":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "utility":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {activeBillTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active bill templates available</p>
        ) : (
          <div className="space-y-3">
            {activeBillTemplates.map((billTemplate) => {
              const isSelected = selectedDependencies.includes(billTemplate.id)
              return (
                <div key={billTemplate.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`dependency-${billTemplate.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleDependency(billTemplate.id)}
                  />
                  <Label
                    htmlFor={`dependency-${billTemplate.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{billTemplate.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${getBillTypeColor(billTemplate.billType)}`}
                      >
                        {billTemplate.billType}
                      </Badge>
                      {billTemplate.description && (
                        <span className="text-xs text-muted-foreground">
                          {billTemplate.description}
                        </span>
                      )}
                    </div>
                  </Label>
                </div>
              )
            })}
          </div>
        )}
        {selectedDependencies.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">
              Selected ({selectedDependencies.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedDependencies.map((templateId) => {
                const template = activeBillTemplates.find((t) => t.id === templateId)
                if (!template) return null
                return (
                  <Badge
                    key={templateId}
                    variant="secondary"
                    className={`text-xs ${getBillTypeColor(template.billType)}`}
                  >
                    {template.name}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

