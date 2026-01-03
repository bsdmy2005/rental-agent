"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { WizardStep } from "../wizard-step"
import { useWizardState, type BillTemplateState } from "../wizard-state"
import { Plus, Trash2, X, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { WizardRuleBuilder } from "./wizard-rule-builder"
import { toast } from "sonner"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

export function BillTemplatesStep() {
  const { state, updateBillTemplates } = useWizardState()
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

  const addBillTemplate = () => {
    const newTemplate: BillTemplateState = {
      name: "",
      billType: "municipality",
      expectedDayOfMonth: undefined
    }
    updateBillTemplates([...state.billTemplates, newTemplate])
  }

  const removeBillTemplate = (index: number) => {
    updateBillTemplates(state.billTemplates.filter((_, i) => i !== index))
  }

  const updateBillTemplate = (index: number, field: keyof BillTemplateState, value: string | number | undefined | BillTemplateState["newRule"]) => {
    const updated = [...state.billTemplates]
    updated[index] = { ...updated[index], [field]: value }
    updateBillTemplates(updated)
  }

  const handleSaveRule = async (index: number, ruleData: BillTemplateState["newRule"]) => {
    if (!state.property.propertyId) {
      toast.error("Property must be saved first")
      return
    }

    const template = state.billTemplates[index]
    if (!template.name.trim()) {
      toast.error("Please enter a template name first")
      return
    }

    setSavingIndex(index)
    try {
      const { saveBillTemplateStep } = await import("../wizard-step-actions")
      const result = await saveBillTemplateStep(
        {
          ...template,
          newRule: ruleData
        },
        state.property.propertyId
      )

      if (result.isSuccess) {
        const updated = [...state.billTemplates]
        updated[index] = {
          ...updated[index],
          newRule: ruleData,
          billTemplateId: result.billTemplateId,
          ruleId: result.ruleId
        }
        updateBillTemplates(updated)
        setEditingRuleIndex(null) // Close the rule builder after saving
        toast.success("Bill template and rule saved successfully!")
      } else {
        toast.error(result.message || "Failed to save bill template")
      }
    } catch (error) {
      console.error("Error saving bill template:", error)
      toast.error("An error occurred while saving")
    } finally {
      setSavingIndex(null)
    }
  }

  const handleCancelRule = () => {
    setEditingRuleIndex(null)
  }

  return (
    <WizardStep
      title="Step 2: Bill Templates & Rules"
      description="Define the types of bills you expect to receive and configure extraction rules"
    >
      <div className="space-y-4">
        {state.billTemplates.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground mb-4">No bill templates added yet</p>
            <Button variant="outline" onClick={addBillTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bill Template
            </Button>
          </div>
        )}

        {state.billTemplates.map((template, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Bill Template {index + 1}</CardTitle>
                  <CardDescription>Configure this bill template and its extraction rule</CardDescription>
                </div>
                {state.billTemplates.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBillTemplate(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g., City of Cape Town Water Bill"
                  value={template.name}
                  onChange={(e) => updateBillTemplate(index, "name", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Bill Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={template.billType}
                    onValueChange={(value: "municipality" | "levy" | "utility" | "other") => updateBillTemplate(index, "billType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="municipality">Municipality</SelectItem>
                      <SelectItem value="levy">Levy</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expected Arrival Day (Optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g., 3 for 3rd of month"
                    value={template.expectedDayOfMonth || ""}
                    onChange={(e) =>
                      updateBillTemplate(
                        index,
                        "expectedDayOfMonth",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              {/* Rule Configuration */}
              <div className="space-y-2">
                <Label>Extraction Rule</Label>
                {template.billTemplateId ? (
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">
                          Saved to Database
                        </span>
                        {template.newRule && (
                          <Badge variant="secondary" className="text-xs">
                            {template.newRule.extractForInvoice && template.newRule.extractForPayment
                              ? "Invoice & Payment"
                              : template.newRule.extractForInvoice
                                ? "Invoice"
                                : "Payment"}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRuleIndex(editingRuleIndex === index ? null : index)}
                        disabled={savingIndex === index}
                      >
                        {savingIndex === index ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : editingRuleIndex === index ? (
                          "Hide Rule Builder"
                        ) : (
                          "Edit Rule"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : template.newRule ? (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                          Rule Configured (Not Saved)
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {template.newRule.extractForInvoice && template.newRule.extractForPayment
                            ? "Invoice & Payment"
                            : template.newRule.extractForInvoice
                              ? "Invoice"
                              : "Payment"}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRuleIndex(editingRuleIndex === index ? null : index)}
                      >
                        {editingRuleIndex === index ? "Hide Rule Builder" : "Edit Rule"}
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs mt-2">
                      Click "Save Rule Configuration" in the rule builder to save to database.
                    </p>
                  </div>
                ) : (
                  <div>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => setEditingRuleIndex(editingRuleIndex === index ? null : index)}
                      disabled={!template.name.trim()}
                    >
                      Create Extraction Rule
                    </Button>
                    <p className="text-muted-foreground text-xs mt-2">
                      Configure a full extraction rule with field mappings, email filters, and custom instructions.
                    </p>
                  </div>
                )}
              </div>

              {/* Inline Rule Builder */}
              {editingRuleIndex === index && (
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">Rule Builder</h3>
                    <p className="text-muted-foreground text-sm">
                      Complete all steps to configure the extraction rule for "{template.name}".
                    </p>
                  </div>
                  <WizardRuleBuilder
                    billTemplate={template}
                    onSave={(ruleData) => handleSaveRule(index, ruleData)}
                    onCancel={handleCancelRule}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {state.billTemplates.length > 0 && (
          <Button variant="outline" onClick={addBillTemplate} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Another Bill Template
          </Button>
        )}
      </div>
    </WizardStep>
  )
}

