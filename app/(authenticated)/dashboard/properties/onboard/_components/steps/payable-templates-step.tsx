"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { WizardStep } from "../wizard-step"
import { useWizardState, type PayableTemplateState } from "../wizard-state"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"

export function PayableTemplatesStep() {
  const { state, updatePayableTemplates } = useWizardState()

  const addPayableTemplate = () => {
    const newTemplate: PayableTemplateState = {
      name: "",
      dependsOnBillTemplateIds: [],
      scheduledDayOfMonth: undefined
    }
    updatePayableTemplates([...state.payableTemplates, newTemplate])
  }

  const removePayableTemplate = (index: number) => {
    updatePayableTemplates(state.payableTemplates.filter((_, i) => i !== index))
  }

  const updatePayableTemplate = (index: number, field: keyof PayableTemplateState, value: string | string[] | number | undefined) => {
    const updated = [...state.payableTemplates]
    updated[index] = { ...updated[index], [field]: value }
    updatePayableTemplates(updated)
  }

  const toggleBillTemplateDependency = (payableIndex: number, billTemplateIndex: number) => {
    const billTemplate = state.billTemplates[billTemplateIndex]
    // Use actual bill template ID if saved, otherwise use temp ID
    const billTemplateId = billTemplate.billTemplateId || `temp-${billTemplateIndex}`
    const payable = state.payableTemplates[payableIndex]
    const currentDeps = payable.dependsOnBillTemplateIds || []
    
    if (currentDeps.includes(billTemplateId)) {
      updatePayableTemplate(
        payableIndex,
        "dependsOnBillTemplateIds",
        currentDeps.filter((id) => id !== billTemplateId)
      )
    } else {
      updatePayableTemplate(payableIndex, "dependsOnBillTemplateIds", [...currentDeps, billTemplateId])
    }
  }

  return (
    <WizardStep
      title="Step 3: Payable Templates & Schedules"
      description="Define the types of payments you need to make for this property"
    >
      <div className="space-y-4">
        {state.payableTemplates.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground mb-4">No payable templates added yet</p>
            <p className="text-muted-foreground text-sm mb-4">
              Payable templates are optional. You can add them now or later.
            </p>
            <Button variant="outline" onClick={addPayableTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payable Template
            </Button>
          </div>
        )}

        {state.payableTemplates.map((template, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Payable Template {index + 1}</CardTitle>
                  <CardDescription>Configure this payable template and its dependencies</CardDescription>
                </div>
                {state.payableTemplates.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePayableTemplate(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.payableTemplateId && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                      Saved to Database
                    </span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>
                  Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g., Body Corporate Levy Payment"
                  value={template.name}
                  onChange={(e) => updatePayableTemplate(index, "name", e.target.value)}
                  disabled={!!template.payableTemplateId}
                />
              </div>

              <div className="space-y-2">
                <Label>Dependencies (Bill Templates)</Label>
                <p className="text-muted-foreground text-xs mb-2">
                  Select which bill templates this payable depends on. The payable will only be generated after all
                  dependent bills have arrived.
                </p>
                {state.billTemplates.length === 0 ? (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
                    <p className="text-yellow-900 text-sm dark:text-yellow-200">
                      No bill templates available. Please add bill templates in Step 2 first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border p-3">
                    {state.billTemplates
                      .filter((bt) => bt.billTemplateId) // Only show saved bill templates
                      .map((billTemplate, billIndex) => {
                        const originalIndex = state.billTemplates.indexOf(billTemplate)
                        const billTemplateId = billTemplate.billTemplateId!
                        const isSelected = template.dependsOnBillTemplateIds?.includes(billTemplateId) || false
                        return (
                          <div key={originalIndex} className="flex items-center space-x-2">
                            <Checkbox
                              id={`payable-${index}-bill-${originalIndex}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleBillTemplateDependency(index, originalIndex)}
                              disabled={!!template.payableTemplateId}
                            />
                            <Label
                              htmlFor={`payable-${index}-bill-${originalIndex}`}
                              className="text-sm font-normal cursor-pointer flex items-center gap-2"
                            >
                              {billTemplate.name || `Bill Template ${originalIndex + 1}`}
                              <Badge variant="outline">{billTemplate.billType}</Badge>
                              {billTemplate.billTemplateId && (
                                <Badge variant="secondary" className="text-xs">Saved</Badge>
                              )}
                            </Label>
                          </div>
                        )
                      })}
                    {state.billTemplates.filter((bt) => bt.billTemplateId).length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        No bill templates saved yet. Please save bill templates in Step 2 first.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Scheduled Payment Day (Optional)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g., 15 for 15th of each month"
                  value={template.scheduledDayOfMonth || ""}
                  onChange={(e) =>
                    updatePayableTemplate(
                      index,
                      "scheduledDayOfMonth",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  disabled={!!template.payableTemplateId}
                />
                <p className="text-muted-foreground text-xs">
                  The day of the month when this payment should be scheduled. Leave empty to set later.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {state.payableTemplates.length > 0 && (
          <Button variant="outline" onClick={addPayableTemplate} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Another Payable Template
          </Button>
        )}
      </div>
    </WizardStep>
  )
}

