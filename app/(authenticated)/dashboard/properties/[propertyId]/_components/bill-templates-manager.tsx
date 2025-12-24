"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
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
  createBillTemplateAction,
  updateBillTemplateAction,
  deleteBillTemplateAction
} from "@/actions/bill-templates-actions"
import { updateInvoiceTemplateDependencyAction } from "@/actions/rental-invoice-templates-actions"
import { updatePayableTemplateDependencyAction } from "@/actions/payable-templates-actions"
import { type SelectBillTemplate, type SelectRentalInvoiceTemplate, type SelectPayableTemplate, type SelectTenant } from "@/db/schema"
import { ReverseDependencyEditor } from "./reverse-dependency-editor"

interface BillTemplatesManagerProps {
  propertyId: string
  billTemplates: SelectBillTemplate[]
  invoiceTemplates: SelectRentalInvoiceTemplate[]
  payableTemplates: SelectPayableTemplate[]
  tenants: SelectTenant[]
}

export function BillTemplatesManager({
  propertyId,
  billTemplates,
  invoiceTemplates,
  payableTemplates,
  tenants
}: BillTemplatesManagerProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)

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

  // Helper to get reverse dependencies for a bill template
  const getReverseDependencies = (billTemplateId: string) => {
    const invoiceDependents = invoiceTemplates.filter((template) => {
      const deps = (template.dependsOnBillTemplateIds as string[]) || []
      return deps.includes(billTemplateId)
    })
    const payableDependents = payableTemplates.filter((template) => {
      const deps = (template.dependsOnBillTemplateIds as string[]) || []
      return deps.includes(billTemplateId)
    })
    return {
      invoiceDependents: invoiceDependents.map((t) => t.id),
      payableDependents: payableDependents.map((t) => t.id)
    }
  }

  const getTenantName = (tenantId: string | null) => {
    if (!tenantId) return null
    const tenant = tenants.find((t) => t.id === tenantId)
    return tenant?.name || null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bill Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage bill templates and see which invoice/payable templates depend on them
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
        <BillTemplateCreateForm
          propertyId={propertyId}
          onCancel={() => setIsCreating(false)}
          onSave={async (data) => {
            setLoading(true)
            try {
              const result = await createBillTemplateAction({
                ...data,
                propertyId,
                isActive: true
              })
              if (result.isSuccess) {
                toast.success("Bill template created successfully")
                setIsCreating(false)
                router.refresh()
              } else {
                toast.error(result.message || "Failed to create bill template")
              }
            } catch (error) {
              console.error("Error creating bill template:", error)
              toast.error("Failed to create bill template")
            } finally {
              setLoading(false)
            }
          }}
        />
      )}

      {billTemplates.length === 0 && !isCreating && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No bill templates found. Create one to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {billTemplates.map((template) => {
        const isEditing = editingId === template.id
        const reverseDeps = getReverseDependencies(template.id)

        if (isEditing) {
          return (
            <BillTemplateEditForm
              key={template.id}
              template={template}
              invoiceTemplates={invoiceTemplates}
              payableTemplates={payableTemplates}
              tenants={tenants}
              currentInvoiceDependents={reverseDeps.invoiceDependents}
              currentPayableDependents={reverseDeps.payableDependents}
              onCancel={() => setEditingId(null)}
              onSave={async (data, invoiceIds, payableIds) => {
                setLoading(true)
                try {
                  // Update bill template
                  const updateResult = await updateBillTemplateAction(template.id, data)
                  if (!updateResult.isSuccess) {
                    toast.error(updateResult.message || "Failed to update bill template")
                    return
                  }

                  // Update dependencies
                  const currentInvoiceDeps = reverseDeps.invoiceDependents
                  const currentPayableDeps = reverseDeps.payableDependents

                  // Find templates to add/remove
                  const invoicesToAdd = invoiceIds.filter((id) => !currentInvoiceDeps.includes(id))
                  const invoicesToRemove = currentInvoiceDeps.filter((id) => !invoiceIds.includes(id))
                  const payablesToAdd = payableIds.filter((id) => !currentPayableDeps.includes(id))
                  const payablesToRemove = currentPayableDeps.filter((id) => !payableIds.includes(id))

                  // Update invoice templates
                  for (const invoiceId of invoicesToAdd) {
                    const result = await updateInvoiceTemplateDependencyAction(
                      invoiceId,
                      template.id,
                      true
                    )
                    if (!result.isSuccess) {
                      console.error(`Failed to add dependency to invoice template ${invoiceId}`)
                    }
                  }
                  for (const invoiceId of invoicesToRemove) {
                    const result = await updateInvoiceTemplateDependencyAction(
                      invoiceId,
                      template.id,
                      false
                    )
                    if (!result.isSuccess) {
                      console.error(`Failed to remove dependency from invoice template ${invoiceId}`)
                    }
                  }

                  // Update payable templates
                  for (const payableId of payablesToAdd) {
                    const result = await updatePayableTemplateDependencyAction(
                      payableId,
                      template.id,
                      true
                    )
                    if (!result.isSuccess) {
                      console.error(`Failed to add dependency to payable template ${payableId}`)
                    }
                  }
                  for (const payableId of payablesToRemove) {
                    const result = await updatePayableTemplateDependencyAction(
                      payableId,
                      template.id,
                      false
                    )
                    if (!result.isSuccess) {
                      console.error(`Failed to remove dependency from payable template ${payableId}`)
                    }
                  }

                  toast.success("Bill template and dependencies updated successfully")
                  setEditingId(null)
                  router.refresh()
                } catch (error) {
                  console.error("Error updating bill template:", error)
                  toast.error("Failed to update bill template")
                } finally {
                  setLoading(false)
                }
              }}
            />
          )
        }

        return (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${getBillTypeColor(template.billType)}`}
                    >
                      {template.billType}
                    </Badge>
                    {!template.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </CardTitle>
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
                              const result = await deleteBillTemplateAction(template.id)
                              if (result.isSuccess) {
                                toast.success("Bill template deleted successfully")
                                router.refresh()
                              } else {
                                toast.error(result.message || "Failed to delete bill template")
                              }
                            } catch (error) {
                              console.error("Error deleting bill template:", error)
                              toast.error("Failed to delete bill template")
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
                  Dependencies ({reverseDeps.invoiceDependents.length + reverseDeps.payableDependents.length}):
                </p>
                {reverseDeps.invoiceDependents.length === 0 &&
                reverseDeps.payableDependents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No invoice or payable templates depend on this bill template
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reverseDeps.invoiceDependents.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Invoice Templates ({reverseDeps.invoiceDependents.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {reverseDeps.invoiceDependents.map((invoiceId) => {
                            const invoiceTemplate = invoiceTemplates.find((t) => t.id === invoiceId)
                            if (!invoiceTemplate) return null
                            const tenantName = getTenantName(invoiceTemplate.tenantId)
                            return (
                              <Badge
                                key={invoiceId}
                                variant="secondary"
                                className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                              >
                                {invoiceTemplate.name}
                                {tenantName && ` (${tenantName})`}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {reverseDeps.payableDependents.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Payable Templates ({reverseDeps.payableDependents.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {reverseDeps.payableDependents.map((payableId) => {
                            const payableTemplate = payableTemplates.find((t) => t.id === payableId)
                            if (!payableTemplate) return null
                            return (
                              <Badge
                                key={payableId}
                                variant="secondary"
                                className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
                              >
                                {payableTemplate.name}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )}
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

interface BillTemplateEditFormProps {
  template: SelectBillTemplate
  invoiceTemplates: SelectRentalInvoiceTemplate[]
  payableTemplates: SelectPayableTemplate[]
  tenants: SelectTenant[]
  currentInvoiceDependents: string[]
  currentPayableDependents: string[]
  onCancel: () => void
  onSave: (
    data: {
      name: string
      billType: "municipality" | "levy" | "utility" | "other"
      description: string | null
    },
    invoiceIds: string[],
    payableIds: string[]
  ) => Promise<void>
}

function BillTemplateEditForm({
  template,
  invoiceTemplates,
  payableTemplates,
  tenants,
  currentInvoiceDependents,
  currentPayableDependents,
  onCancel,
  onSave
}: BillTemplateEditFormProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    billType: template.billType,
    description: template.description || ""
  })
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(currentInvoiceDependents)
  const [selectedPayableIds, setSelectedPayableIds] = useState<string[]>(currentPayableDependents)

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    await onSave(
      {
        name: formData.name.trim(),
        billType: formData.billType,
        description: formData.description.trim() || null
      },
      selectedInvoiceIds,
      selectedPayableIds
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Bill Template</CardTitle>
        <CardDescription>Edit template details and dependencies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bill-name">Template Name</Label>
          <Input
            id="bill-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., City of Cape Town Water Bill"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bill-type">Bill Type</Label>
          <Select
            value={formData.billType}
            onValueChange={(value: "municipality" | "levy" | "utility" | "other") =>
              setFormData({ ...formData, billType: value })
            }
          >
            <SelectTrigger id="bill-type">
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
          <Label htmlFor="bill-description">Description</Label>
          <Textarea
            id="bill-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <ReverseDependencyEditor
          billTemplateId={template.id}
          invoiceTemplates={invoiceTemplates}
          payableTemplates={payableTemplates}
          tenants={tenants}
          currentInvoiceDependents={selectedInvoiceIds}
          currentPayableDependents={selectedPayableIds}
          onDependenciesChange={(invoiceIds, payableIds) => {
            setSelectedInvoiceIds(invoiceIds)
            setSelectedPayableIds(payableIds)
          }}
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

interface BillTemplateCreateFormProps {
  propertyId: string
  onCancel: () => void
  onSave: (data: {
    propertyId: string
    name: string
    billType: "municipality" | "levy" | "utility" | "other"
    description: string | null
    isActive: boolean
  }) => Promise<void>
}

function BillTemplateCreateForm({
  propertyId,
  onCancel,
  onSave
}: BillTemplateCreateFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    billType: "municipality" as "municipality" | "levy" | "utility" | "other",
    description: ""
  })

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    await onSave({
      propertyId,
      name: formData.name.trim(),
      billType: formData.billType,
      description: formData.description.trim() || null,
      isActive: true
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Bill Template</CardTitle>
        <CardDescription>Create a new bill template</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="create-bill-name">Template Name</Label>
          <Input
            id="create-bill-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., City of Cape Town Water Bill"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-bill-type">Bill Type</Label>
          <Select
            value={formData.billType}
            onValueChange={(value: "municipality" | "levy" | "utility" | "other") =>
              setFormData({ ...formData, billType: value })
            }
          >
            <SelectTrigger id="create-bill-type">
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
          <Label htmlFor="create-bill-description">Description</Label>
          <Textarea
            id="create-bill-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

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

