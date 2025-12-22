"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  createPayableTemplateAction,
  updatePayableTemplateAction,
  deletePayableTemplateAction
} from "@/actions/payable-templates-actions"
import { type SelectPayableTemplate, type SelectBillTemplate } from "@/db/schema"
import { TemplateDependencyEditor } from "./template-dependency-editor"

interface PayableTemplatesManagerProps {
  propertyId: string
  payableTemplates: SelectPayableTemplate[]
  billTemplates: SelectBillTemplate[]
}

export function PayableTemplatesManager({
  propertyId,
  payableTemplates,
  billTemplates
}: PayableTemplatesManagerProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)

  const getBillTemplateName = (templateId: string) => {
    const template = billTemplates.find((t) => t.id === templateId)
    return template?.name || "Unknown Template"
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payable Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage payable templates and their bill template dependencies
          </p>
        </div>
        {!isCreating && (
          <Button variant="outline" onClick={() => setIsCreating(true)} disabled={loading}>
            <Plus className="h-4 w-4 mr-1" />
            Create Template
          </Button>
        )}
      </div>

      {isCreating && (
        <PayableTemplateCreateForm
          propertyId={propertyId}
          billTemplates={billTemplates}
          onCancel={() => setIsCreating(false)}
          onSave={async (data) => {
            setLoading(true)
            try {
              const result = await createPayableTemplateAction({
                ...data,
                propertyId,
                isActive: true
              })
              if (result.isSuccess) {
                toast.success("Template created successfully")
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
          }}
        />
      )}

      {payableTemplates.length === 0 && !isCreating && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No payable templates found. Create one to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {payableTemplates.map((template) => {
        const isEditing = editingId === template.id

        if (isEditing) {
          return (
            <PayableTemplateEditForm
              key={template.id}
              template={template}
              billTemplates={billTemplates}
              onCancel={() => setEditingId(null)}
              onSave={async (data) => {
                setLoading(true)
                try {
                  const result = await updatePayableTemplateAction(template.id, data)
                  if (result.isSuccess) {
                    toast.success("Template updated successfully")
                    setEditingId(null)
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
              }}
            />
          )
        }

        const dependencies = (template.dependsOnBillTemplateIds as string[]) || []

        return (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.description || "No description"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(template.id)}
                    disabled={loading}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={loading}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{template.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setLoading(true)
                            try {
                              const result = await deletePayableTemplateAction(template.id)
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
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm font-medium mb-2">
                  Dependencies ({dependencies.length}):
                </p>
                {dependencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No dependencies configured</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dependencies.map((templateId) => {
                      const billTemplate = billTemplates.find((t) => t.id === templateId)
                      if (!billTemplate) return null
                      return (
                        <Badge
                          key={templateId}
                          variant="secondary"
                          className={`text-xs ${getBillTypeColor(billTemplate.billType)}`}
                        >
                          {billTemplate.name}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface PayableTemplateEditFormProps {
  template: SelectPayableTemplate
  billTemplates: SelectBillTemplate[]
  onCancel: () => void
  onSave: (data: {
    name: string
    description: string | null
    dependsOnBillTemplateIds: string[]
  }) => Promise<void>
}

function PayableTemplateEditForm({
  template,
  billTemplates,
  onCancel,
  onSave
}: PayableTemplateEditFormProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || "",
    dependencies: (template.dependsOnBillTemplateIds as string[]) || []
  })

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    if (formData.dependencies.length === 0) {
      toast.error("At least one bill template dependency is required")
      return
    }

    await onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      dependsOnBillTemplateIds: formData.dependencies
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Payable Template</CardTitle>
        <CardDescription>Edit template details and dependencies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payable-name">Template Name</Label>
          <Input
            id="payable-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Body Corporate Levy Payment"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payable-description">Description</Label>
          <Textarea
            id="payable-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <TemplateDependencyEditor
          billTemplates={billTemplates}
          selectedDependencies={formData.dependencies}
          onDependenciesChange={(dependencies) =>
            setFormData({ ...formData, dependencies })
          }
          title="Bill Template Dependencies"
          description="Select which bill templates must arrive before generating payables"
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface PayableTemplateCreateFormProps {
  propertyId: string
  billTemplates: SelectBillTemplate[]
  onCancel: () => void
  onSave: (data: {
    propertyId: string
    name: string
    description: string | null
    dependsOnBillTemplateIds: string[]
    isActive: boolean
  }) => Promise<void>
}

function PayableTemplateCreateForm({
  propertyId,
  billTemplates,
  onCancel,
  onSave
}: PayableTemplateCreateFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    dependencies: [] as string[]
  })

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    if (formData.dependencies.length === 0) {
      toast.error("At least one bill template dependency is required")
      return
    }

    await onSave({
      propertyId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      dependsOnBillTemplateIds: formData.dependencies,
      isActive: true
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Payable Template</CardTitle>
        <CardDescription>Create a new payable template</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="create-payable-name">Template Name</Label>
          <Input
            id="create-payable-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Body Corporate Levy Payment"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-payable-description">Description</Label>
          <Textarea
            id="create-payable-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <TemplateDependencyEditor
          billTemplates={billTemplates}
          selectedDependencies={formData.dependencies}
          onDependenciesChange={(dependencies) =>
            setFormData({ ...formData, dependencies })
          }
          title="Bill Template Dependencies"
          description="Select which bill templates must arrive before generating payables"
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Create Template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

