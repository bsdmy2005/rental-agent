"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Edit2, Save, X, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  createRentalInvoiceTemplateAction,
  updateRentalInvoiceTemplateAction,
  deleteRentalInvoiceTemplateAction,
  autoCreateRentalInvoiceTemplateForTenantAction
} from "@/actions/rental-invoice-templates-actions"
import { type SelectRentalInvoiceTemplate, type SelectBillTemplate, type SelectExtractionRule } from "@/db/schema"

interface RentalInvoiceTemplatesManagerProps {
  tenantId: string
  propertyId: string
  tenantName: string
  existingTemplate: SelectRentalInvoiceTemplate | null
  billTemplates: SelectBillTemplate[]
  extractionRules: SelectExtractionRule[]
}

export function RentalInvoiceTemplatesManager({
  tenantId,
  propertyId,
  tenantName,
  existingTemplate,
  billTemplates,
  extractionRules
}: RentalInvoiceTemplatesManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state for editing/creating
  const [formData, setFormData] = useState({
    name: existingTemplate?.name || `${tenantName} Rental Invoice`,
    description: existingTemplate?.description || "",
    generationDay: existingTemplate?.generationDayOfMonth || 5,
    pdfTemplate: (existingTemplate?.pdfTemplate as "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact") || "classic",
    dependencies: (existingTemplate?.dependsOnBillTemplateIds as string[]) || []
  })

  // Get all active bill templates
  const activeBillTemplates = useMemo(() => {
    return billTemplates.filter((bt) => bt.isActive)
  }, [billTemplates])

  // Create map of billTemplateId -> rule with invoice extraction
  const invoiceRulesMap = useMemo(() => {
    const map = new Map<string, SelectExtractionRule>()
    for (const rule of extractionRules) {
      if (rule.extractForInvoice && rule.isActive) {
        const templates = billTemplates.filter((bt) => bt.extractionRuleId === rule.id)
        for (const template of templates) {
          map.set(template.id, rule)
        }
      }
    }
    return map
  }, [extractionRules, billTemplates])

  const toggleDependency = (billTemplateId: string) => {
    const currentDeps = formData.dependencies
    if (currentDeps.includes(billTemplateId)) {
      setFormData({
        ...formData,
        dependencies: currentDeps.filter((id) => id !== billTemplateId)
      })
    } else {
      setFormData({
        ...formData,
        dependencies: [...currentDeps, billTemplateId]
      })
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    if (formData.dependencies.length === 0) {
      toast.error("At least one bill template dependency is required")
      return
    }

    if (formData.generationDay < 1 || formData.generationDay > 31) {
      toast.error("Generation day must be between 1 and 31")
      return
    }

    setLoading(true)
    try {
      const result = await createRentalInvoiceTemplateAction({
        propertyId,
        tenantId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        dependsOnBillTemplateIds: formData.dependencies,
        generationDayOfMonth: formData.generationDay,
        pdfTemplate: formData.pdfTemplate,
        isActive: true
      })

      if (result.isSuccess) {
        toast.success("Rental invoice template created successfully")
        setIsCreating(false)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to create template")
      }
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!existingTemplate) return

    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    if (formData.dependencies.length === 0) {
      toast.error("At least one bill template dependency is required")
      return
    }

    if (formData.generationDay < 1 || formData.generationDay > 31) {
      toast.error("Generation day must be between 1 and 31")
      return
    }

    setLoading(true)
    try {
      const result = await updateRentalInvoiceTemplateAction(existingTemplate.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        dependsOnBillTemplateIds: formData.dependencies,
        generationDayOfMonth: formData.generationDay,
        pdfTemplate: formData.pdfTemplate
      })

      if (result.isSuccess) {
        toast.success("Template updated successfully")
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message || "Failed to update template")
      }
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!existingTemplate) return

    setLoading(true)
    try {
      const result = await deleteRentalInvoiceTemplateAction(existingTemplate.id)

      if (result.isSuccess) {
        toast.success("Template deleted successfully")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to delete template")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    } finally {
      setLoading(false)
    }
  }

  const handleAutoCreate = async () => {
    setLoading(true)
    try {
      const result = await autoCreateRentalInvoiceTemplateForTenantAction(
        tenantId,
        propertyId,
        5,
        tenantName
      )

      if (result.isSuccess) {
        if (result.data) {
          toast.success("Rental invoice template auto-created successfully")
          router.refresh()
        } else {
          toast.info("Template already exists")
        }
      } else {
        toast.error(result.message || "Failed to auto-create template")
      }
    } catch (error) {
      console.error("Error auto-creating template:", error)
      toast.error("Failed to auto-create template")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (existingTemplate) {
      setFormData({
        name: existingTemplate.name,
        description: existingTemplate.description || "",
        generationDay: existingTemplate.generationDayOfMonth,
        pdfTemplate: (existingTemplate.pdfTemplate as "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact") || "classic",
        dependencies: (existingTemplate.dependsOnBillTemplateIds as string[]) || []
      })
      setIsEditing(false)
    } else {
      setFormData({
        name: `${tenantName} Rental Invoice`,
        description: "",
        generationDay: 5,
        pdfTemplate: "classic",
        dependencies: []
      })
      setIsCreating(false)
    }
  }

  // If no template exists, show create form
  if (!existingTemplate && !isCreating) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rental Invoice Template</CardTitle>
              <CardDescription>
                Create an invoice template for this tenant. Specify which bill templates must arrive before generating invoices.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAutoCreate} disabled={loading}>
                Auto-Create
              </Button>
              <Button variant="default" size="sm" onClick={() => setIsCreating(true)} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm mb-4">
              No rental invoice template created yet
            </p>
            <p className="text-muted-foreground text-xs">
              Click "Create Template" to create one manually, or "Auto-Create" to generate one with default settings
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show create form
  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Rental Invoice Template</CardTitle>
          <CardDescription>
            Create an invoice template for this tenant. Specify which bill templates must arrive before generating invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Monthly Rental Invoice"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generation-day">Generation Day of Month *</Label>
            <Input
              id="generation-day"
              type="number"
              min="1"
              max="31"
              value={formData.generationDay}
              onChange={(e) =>
                setFormData({ ...formData, generationDay: parseInt(e.target.value, 10) || 5 })
              }
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Day of the month (1-31) when invoices should be generated
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdf-template">PDF Template Style *</Label>
            <Select
              value={formData.pdfTemplate}
              onValueChange={(value: "classic" | "modern" | "minimal" | "professional" | "elegant" | "compact") =>
                setFormData({ ...formData, pdfTemplate: value })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select PDF template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic - Traditional professional layout</SelectItem>
                <SelectItem value="modern">Modern - Colorful and contemporary design</SelectItem>
                <SelectItem value="minimal">Minimal - Clean and simple layout</SelectItem>
                <SelectItem value="professional">Professional - Corporate formal style</SelectItem>
                <SelectItem value="elegant">Elegant - Sophisticated refined design</SelectItem>
                <SelectItem value="compact">Compact - Space-efficient dense layout</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the visual style for generated PDF invoices
            </p>
          </div>

          <div className="space-y-3">
            <Label>Bill Template Dependencies *</Label>
            <p className="text-xs text-muted-foreground">
              Select which bill templates must arrive before generating invoices for this tenant
            </p>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {activeBillTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active bill templates available. Create bill templates first.
                </p>
              ) : (
                activeBillTemplates.map((bt) => {
                  const isSelected = formData.dependencies.includes(bt.id)
                  const hasInvoiceExtraction = invoiceRulesMap.has(bt.id)
                  return (
                    <div
                      key={bt.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleDependency(bt.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDependency(bt.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{bt.name}</div>
                          <div className="text-sm text-muted-foreground">{bt.billType}</div>
                        </div>
                      </div>
                      {hasInvoiceExtraction && (
                        <Badge variant="outline" className="text-xs">
                          Invoice extraction
                        </Badge>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || formData.dependencies.length === 0}>
              {loading ? "Creating..." : "Create Template"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show existing template (view or edit mode)
  if (!existingTemplate) {
    return null
  }

  const dependencies = (existingTemplate.dependsOnBillTemplateIds as string[]) || []
  const dependencyNames = dependencies
    .map((id) => billTemplates.find((bt) => bt.id === id)?.name)
    .filter(Boolean)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rental Invoice Template</CardTitle>
            <CardDescription>
              Manage the invoice template for this tenant. Only one template per tenant is allowed.
            </CardDescription>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={loading}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={loading}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this rental invoice template. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Template Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-generation-day">Generation Day of Month *</Label>
              <Input
                id="edit-generation-day"
                type="number"
                min="1"
                max="31"
                value={formData.generationDay}
                onChange={(e) =>
                  setFormData({ ...formData, generationDay: parseInt(e.target.value, 10) || 5 })
                }
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-pdf-template">PDF Template Style *</Label>
              <Select
                value={formData.pdfTemplate}
                onValueChange={(value: "classic" | "modern" | "minimal") =>
                  setFormData({ ...formData, pdfTemplate: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select PDF template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic - Traditional professional layout</SelectItem>
                  <SelectItem value="modern">Modern - Colorful and contemporary design</SelectItem>
                  <SelectItem value="minimal">Minimal - Clean and simple layout</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the visual style for generated PDF invoices
              </p>
            </div>

            <div className="space-y-3">
              <Label>Bill Template Dependencies *</Label>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {activeBillTemplates.map((bt) => {
                  const isSelected = formData.dependencies.includes(bt.id)
                  const hasInvoiceExtraction = invoiceRulesMap.has(bt.id)
                  return (
                    <div
                      key={bt.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleDependency(bt.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDependency(bt.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{bt.name}</div>
                          <div className="text-sm text-muted-foreground">{bt.billType}</div>
                        </div>
                      </div>
                      {hasInvoiceExtraction && (
                        <Badge variant="outline" className="text-xs">
                          Invoice extraction
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={loading || formData.dependencies.length === 0}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Template Name</p>
              <p className="font-medium">{existingTemplate.name}</p>
            </div>

            {existingTemplate.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{existingTemplate.description}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">Generation Day</p>
              <p className="text-sm">
                Day {existingTemplate.generationDayOfMonth} of each month
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Bill Template Dependencies</p>
              {dependencyNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dependencies configured</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dependencyNames.map((name, idx) => (
                    <Badge key={idx} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Badge variant={existingTemplate.isActive ? "default" : "secondary"}>
                {existingTemplate.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
