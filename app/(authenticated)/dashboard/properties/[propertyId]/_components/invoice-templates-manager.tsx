"use client"

import { useState, useEffect } from "react"
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
import { Edit2, Save, X, Trash2, Plus, Calendar } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createRentalInvoiceTemplateAction,
  updateRentalInvoiceTemplateAction,
  deleteRentalInvoiceTemplateAction
} from "@/actions/rental-invoice-templates-actions"
import { updateTenantRentalAmountAction } from "@/actions/tenants-actions"
import { type SelectRentalInvoiceTemplate, type SelectBillTemplate, type SelectTenant } from "@/db/schema"
import { type FixedLineItem } from "@/types/invoice-types"
import { TemplateDependencyEditor } from "./template-dependency-editor"
import { FixedLineItemsManager } from "./fixed-line-items-manager"
import { getActiveFixedCostsForTenantAction } from "@/actions/fixed-costs-actions"

interface InvoiceTemplatesManagerProps {
  propertyId: string
  invoiceTemplates: Array<SelectRentalInvoiceTemplate & { tenant: SelectTenant | null }>
  tenants: SelectTenant[]
  billTemplates: SelectBillTemplate[]
}

export function InvoiceTemplatesManager({
  propertyId,
  invoiceTemplates,
  tenants,
  billTemplates
}: InvoiceTemplatesManagerProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creatingForTenantId, setCreatingForTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Get tenants without templates
  const tenantsWithoutTemplates = tenants.filter(
    (tenant) => !invoiceTemplates.some((template) => template.tenantId === tenant.id)
  )

  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    return tenant?.name || "Unknown Tenant"
  }

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
          <h3 className="text-lg font-semibold">Rental Invoice Templates</h3>
          <p className="text-sm text-muted-foreground">
            Manage invoice templates and their bill template dependencies
          </p>
        </div>
      </div>

      {invoiceTemplates.length === 0 && tenantsWithoutTemplates.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No tenants found for this property
            </p>
          </CardContent>
        </Card>
      )}

      {invoiceTemplates.map((template) => {
        const isEditing = editingId === template.id
        const tenant = template.tenant

        if (isEditing) {
          return (
            <InvoiceTemplateEditForm
              key={template.id}
              template={template}
              tenant={tenant}
              billTemplates={billTemplates}
              onCancel={() => setEditingId(null)}
              onSave={async (data) => {
                setLoading(true)
                try {
                  const result = await updateRentalInvoiceTemplateAction(template.id, {
                    name: data.name,
                    description: data.description,
                    generationDayOfMonth: data.generationDayOfMonth,
                    dependsOnBillTemplateIds: data.dependsOnBillTemplateIds,
                    fixedLineItems: data.fixedLineItems
                  })
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
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    {tenant && (
                      <Badge variant="outline" className="text-xs">
                        {tenant.name}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {template.description || "No description"}
                  </CardDescription>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Generation Day: {template.generationDayOfMonth}</span>
                    </div>
                  </div>
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
                              const result = await deleteRentalInvoiceTemplateAction(template.id)
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
            <CardContent className="space-y-4">
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

              <div>
                <p className="text-sm font-medium mb-2">
                  Fixed Line Items ({(template.fixedLineItems as FixedLineItem[])?.length || 0}):
                </p>
                {!template.fixedLineItems || (template.fixedLineItems as FixedLineItem[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No fixed line items. Click "Edit" to add fixed line items.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(template.fixedLineItems as FixedLineItem[]).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            R {item.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {tenantsWithoutTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Invoice Template</CardTitle>
            <CardDescription>
              Create invoice templates for tenants without templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenantsWithoutTemplates.map((tenant) => {
                const isCreating = creatingForTenantId === tenant.id
                if (isCreating) {
                  return (
                    <InvoiceTemplateCreateForm
                      key={tenant.id}
                      propertyId={propertyId}
                      tenant={tenant}
                      billTemplates={billTemplates}
                      onCancel={() => setCreatingForTenantId(null)}
                      onSave={async (data) => {
                        setLoading(true)
                        try {
                          const result = await createRentalInvoiceTemplateAction({
                            propertyId,
                            tenantId: tenant.id,
                            name: data.name,
                            description: data.description,
                            generationDayOfMonth: data.generationDayOfMonth,
                            dependsOnBillTemplateIds: data.dependsOnBillTemplateIds,
                            fixedLineItems: data.fixedLineItems,
                            isActive: true
                          })
                          if (result.isSuccess) {
                            toast.success("Template created successfully")
                            setCreatingForTenantId(null)
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
                  )
                }
                return (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">No invoice template</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreatingForTenantId(tenant.id)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Template
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface InvoiceTemplateEditFormProps {
  template: SelectRentalInvoiceTemplate
  tenant: SelectTenant | null
  billTemplates: SelectBillTemplate[]
  onCancel: () => void
  onSave: (data: {
    name: string
    description: string | null
    generationDayOfMonth: number
    dependsOnBillTemplateIds: string[]
    fixedLineItems?: FixedLineItem[]
  }) => Promise<void>
}

function InvoiceTemplateEditForm({
  template,
  tenant,
  billTemplates,
  onCancel,
  onSave
}: InvoiceTemplateEditFormProps) {
  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description || "",
    generationDay: template.generationDayOfMonth,
    dependencies: (template.dependsOnBillTemplateIds as string[]) || [],
    fixedLineItems: (template.fixedLineItems as FixedLineItem[]) || []
  })
  const [rentalAmount, setRentalAmount] = useState<string>("")
  const [rentalAmountLoading, setRentalAmountLoading] = useState(false)
  const [savingRentalAmount, setSavingRentalAmount] = useState(false)

  // Load rental amount on mount
  useEffect(() => {
    const loadRentalAmount = async () => {
      if (!tenant) return

      setRentalAmountLoading(true)
      try {
        // Get rental amount from fixed costs (rent type) first, then fall back to tenant.rentalAmount
        const fixedCostsResult = await getActiveFixedCostsForTenantAction(tenant.id)
        if (fixedCostsResult.isSuccess && fixedCostsResult.data) {
          const rentFixedCost = fixedCostsResult.data.find(
            (fc) => fc.costType === "rent" && fc.isActive
          )
          if (rentFixedCost) {
            setRentalAmount(rentFixedCost.amount)
            return
          }
        }
        // Fallback to tenant.rentalAmount
        if (tenant.rentalAmount) {
          setRentalAmount(tenant.rentalAmount)
        }
      } catch (error) {
        console.error("Error loading rental amount:", error)
      } finally {
        setRentalAmountLoading(false)
      }
    }
    loadRentalAmount()
  }, [tenant])

  const handleSaveRentalAmount = async () => {
    if (!tenant) return

    const amount = parseFloat(rentalAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Rental amount must be a positive number")
      return
    }

    setSavingRentalAmount(true)
    try {
      const result = await updateTenantRentalAmountAction(tenant.id, amount)
      if (result.isSuccess) {
        toast.success("Rental amount updated successfully")
      } else {
        toast.error(result.message || "Failed to update rental amount")
      }
    } catch (error) {
      console.error("Error updating rental amount:", error)
      toast.error("Failed to update rental amount")
    } finally {
      setSavingRentalAmount(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    if (formData.generationDay < 1 || formData.generationDay > 31) {
      toast.error("Generation day must be between 1 and 31")
      return
    }

    await onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      generationDayOfMonth: formData.generationDay,
      dependsOnBillTemplateIds: formData.dependencies,
      fixedLineItems: formData.fixedLineItems.length > 0 ? formData.fixedLineItems : undefined
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Invoice Template</CardTitle>
        <CardDescription>
          {tenant ? `For tenant: ${tenant.name}` : "Edit template details"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tenant && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="rental-amount">Rental Amount</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rental-amount"
                type="number"
                step="0.01"
                min="0"
                value={rentalAmount}
                onChange={(e) => setRentalAmount(e.target.value)}
                placeholder="0.00"
                disabled={rentalAmountLoading || savingRentalAmount}
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveRentalAmount}
                disabled={rentalAmountLoading || savingRentalAmount}
              >
                {savingRentalAmount ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This updates the tenant's rental amount used in invoice generation
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Monthly Rental Invoice"
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
          <Label htmlFor="generationDay">Generation Day of Month</Label>
          <Input
            id="generationDay"
            type="number"
            min="1"
            max="31"
            value={formData.generationDay}
            onChange={(e) =>
              setFormData({ ...formData, generationDay: parseInt(e.target.value, 10) || 1 })
            }
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Day of the month when invoices will be generated (1-31)
          </p>
        </div>

        <TemplateDependencyEditor
          billTemplates={billTemplates}
          selectedDependencies={formData.dependencies}
          onDependenciesChange={(dependencies) =>
            setFormData({ ...formData, dependencies })
          }
        />

        <div className="space-y-2">
          <Label>Fixed Line Items</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Add fixed line items that will appear on every invoice generated from this template
          </p>
          <FixedLineItemsManager
            items={formData.fixedLineItems}
            onItemsChange={(items) =>
              setFormData({ ...formData, fixedLineItems: items })
            }
          />
        </div>

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

interface InvoiceTemplateCreateFormProps {
  propertyId: string
  tenant: SelectTenant
  billTemplates: SelectBillTemplate[]
  onCancel: () => void
  onSave: (data: {
    propertyId: string
    tenantId: string
    name: string
    description: string | null
    generationDayOfMonth: number
    dependsOnBillTemplateIds: string[]
    fixedLineItems?: FixedLineItem[]
    isActive: boolean
  }) => Promise<void>
}

function InvoiceTemplateCreateForm({
  propertyId,
  tenant,
  billTemplates,
  onCancel,
  onSave
}: InvoiceTemplateCreateFormProps) {
  const [formData, setFormData] = useState({
    name: `${tenant.name} Rental Invoice`,
    description: "",
    generationDay: 5,
    dependencies: [] as string[],
    fixedLineItems: [] as FixedLineItem[]
  })

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required")
      return
    }

    if (formData.generationDay < 1 || formData.generationDay > 31) {
      toast.error("Generation day must be between 1 and 31")
      return
    }

    await onSave({
      propertyId,
      tenantId: tenant.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      generationDayOfMonth: formData.generationDay,
      dependsOnBillTemplateIds: formData.dependencies,
      fixedLineItems: formData.fixedLineItems.length > 0 ? formData.fixedLineItems : undefined,
      isActive: true
    })
  }

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>Create Invoice Template</CardTitle>
        <CardDescription>For tenant: {tenant.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="create-name">Template Name</Label>
          <Input
            id="create-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Monthly Rental Invoice"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-description">Description</Label>
          <Textarea
            id="create-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-generationDay">Generation Day of Month</Label>
          <Input
            id="create-generationDay"
            type="number"
            min="1"
            max="31"
            value={formData.generationDay}
            onChange={(e) =>
              setFormData({ ...formData, generationDay: parseInt(e.target.value, 10) || 1 })
            }
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">
            Day of the month when invoices will be generated (1-31)
          </p>
        </div>

        <TemplateDependencyEditor
          billTemplates={billTemplates}
          selectedDependencies={formData.dependencies}
          onDependenciesChange={(dependencies) =>
            setFormData({ ...formData, dependencies })
          }
        />

        <div className="space-y-2">
          <Label>Fixed Line Items</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Add fixed line items that will appear on every invoice generated from this template
          </p>
          <FixedLineItemsManager
            items={formData.fixedLineItems}
            onItemsChange={(items) =>
              setFormData({ ...formData, fixedLineItems: items })
            }
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

