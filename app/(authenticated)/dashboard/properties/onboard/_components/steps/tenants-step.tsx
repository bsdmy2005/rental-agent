"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { WizardStep } from "../wizard-step"
import { useWizardState, type TenantState } from "../wizard-state"
import { Plus, Trash2, FileText, UserPlus, X, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { RentalInvoiceTemplatesConfig } from "./rental-invoice-templates-config"

export function TenantsStep() {
  const { state, updateTenants } = useWizardState()
  const [extracting, setExtracting] = useState<Record<number, boolean>>({})
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

  const handleSaveTenant = async (index: number) => {
    if (!state.property.propertyId) {
      toast.error("Property must be saved first")
      return
    }

    const tenant = state.tenants[index]
    const displayData = tenant.extractedData || tenant.manualData

    if (!displayData || !displayData.name || !displayData.idNumber) {
      toast.error("Please enter tenant name and ID number")
      return
    }

    setSavingIndex(index)
    try {
      // First, upload lease file if available
      let leaseFileUploaded = false
      const hasStartDate = tenant.extractedData?.startDate || tenant.manualData?.leaseStartDate
      const hasEndDate = tenant.extractedData?.endDate || tenant.manualData?.leaseEndDate
      if (tenant.leaseFile && hasStartDate && hasEndDate) {
        try {
          // We'll upload the lease after tenant is created
          // For now, just mark that we have a file to upload
          leaseFileUploaded = true
        } catch (error) {
          console.error("Error preparing lease upload:", error)
        }
      }

      const { saveTenantStep } = await import("../wizard-step-actions")
      
      // Build bill template ID map
      const billTemplateIdMap: Record<number, string> = {}
      state.billTemplates.forEach((template, templateIndex) => {
        if (template.billTemplateId) {
          billTemplateIdMap[templateIndex] = template.billTemplateId
        }
      })

      const result = await saveTenantStep(tenant, state.property.propertyId, billTemplateIdMap)

      if (result.isSuccess) {
        const updated = [...state.tenants]
        updated[index] = {
          ...updated[index],
          tenantId: result.tenantId,
          leaseAgreementId: result.leaseAgreementId,
          rentalInvoiceTemplate: tenant.rentalInvoiceTemplate
            ? {
                ...tenant.rentalInvoiceTemplate,
                rentalInvoiceTemplateId: result.rentalInvoiceTemplateId
              }
            : undefined
        }
        updateTenants(updated)

        // Upload lease file if we have one and tenant was created
        if (leaseFileUploaded && tenant.leaseFile && result.tenantId) {
          try {
            const formData = new FormData()
            formData.append("file", tenant.leaseFile)
            formData.append("tenantId", result.tenantId)
            formData.append("propertyId", state.property.propertyId)

            const uploadResponse = await fetch("/api/lease-agreements/upload", {
              method: "POST",
              body: formData
            })

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json()
              if (uploadResult.success && uploadResult.leaseAgreement) {
                updated[index] = {
                  ...updated[index],
                  leaseAgreementId: uploadResult.leaseAgreement.id
                }
                updateTenants(updated)
              }
            }
          } catch (uploadError) {
            console.error("Error uploading lease file:", uploadError)
            // Continue - lease can be uploaded later
          }
        }

        toast.success("Tenant saved successfully!")
      } else {
        toast.error(result.message || "Failed to save tenant")
      }
    } catch (error) {
      console.error("Error saving tenant:", error)
      toast.error("An error occurred while saving")
    } finally {
      setSavingIndex(null)
    }
  }

  const addTenant = () => {
    const newTenant: TenantState = {
      rentalInvoiceTemplate: undefined // Will be configured in the template config step
    }
    updateTenants([...state.tenants, newTenant])
  }

  const removeTenant = (index: number) => {
    updateTenants(state.tenants.filter((_, i) => i !== index))
  }

  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) {
      const updated = [...state.tenants]
      updated[index] = {
        ...updated[index],
        leaseFile: undefined,
        extractedData: undefined
      }
      updateTenants(updated)
      return
    }

    const updated = [...state.tenants]
    updated[index] = { ...updated[index], leaseFile: file }
    updateTenants(updated)
  }

  const handleExtractFromLease = async (index: number) => {
    const tenant = state.tenants[index]
    if (!tenant.leaseFile) return

    setExtracting((prev) => ({ ...prev, [index]: true }))

    try {
      const formData = new FormData()
      formData.append("file", tenant.leaseFile)

      const response = await fetch("/api/lease-agreements/extract-tenant", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to extract tenant data")
      }

      const result = await response.json()
      if (result.success && result.data) {
        const extractedData = result.data
        const updated = [...state.tenants]
        updated[index] = {
          ...updated[index],
          extractedData: {
            name: extractedData.tenantName || "",
            idNumber: extractedData.tenantIdNumber || "",
            email: extractedData.tenantEmail || "",
            phone: extractedData.tenantPhone || "",
            rentalAmount: extractedData.rentalAmount ? parseFloat(String(extractedData.rentalAmount)) : undefined,
            startDate: extractedData.startDate || "",
            endDate: extractedData.endDate || ""
          }
        }
        updateTenants(updated)
        toast.success("Tenant information extracted successfully!")
      } else {
        throw new Error("Failed to extract tenant data")
      }
    } catch (error) {
      console.error("Error extracting tenant data:", error)
      toast.error(error instanceof Error ? error.message : "Failed to extract tenant data")
    } finally {
      setExtracting((prev) => ({ ...prev, [index]: false }))
    }
  }

  const updateTenantData = (index: number, field: string, value: string | number | undefined) => {
    const updated = [...state.tenants]
    if (!updated[index].manualData) {
      updated[index].manualData = {
        name: "",
        idNumber: "",
        email: "",
        phone: "",
        rentalAmount: undefined
      }
    }
    updated[index] = {
      ...updated[index],
      manualData: {
        ...updated[index].manualData!,
        [field]: value
      }
    }
    updateTenants(updated)
  }

  const updateExtractedData = (index: number, field: string, value: string | number | undefined) => {
    const updated = [...state.tenants]
    if (!updated[index].extractedData) {
      updated[index].extractedData = {
        name: "",
        idNumber: "",
        email: "",
        phone: "",
        rentalAmount: undefined,
        startDate: "",
        endDate: ""
      }
    }
    updated[index] = {
      ...updated[index],
      extractedData: {
        ...updated[index].extractedData!,
        [field]: value
      }
    }
    updateTenants(updated)
  }

  const getTenantDisplayData = (tenant: TenantState) => {
    return tenant.extractedData || tenant.manualData
  }

  return (
    <WizardStep
      title="Step 4: Tenants & Leases"
      description="Add tenants and configure their rental invoice templates"
    >
      <div className="space-y-4">
        {state.tenants.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground mb-4">No tenants added yet</p>
            <Button variant="outline" onClick={addTenant}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </div>
        )}

        {state.tenants.map((tenant, index) => {
          const displayData = getTenantDisplayData(tenant)
          const hasLeaseFile = !!tenant.leaseFile
          const hasExtractedData = !!tenant.extractedData
          const hasManualData = !!tenant.manualData

          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Tenant {index + 1}</CardTitle>
                    <CardDescription>
                      {hasExtractedData
                        ? "Review extracted data and configure rental invoices"
                        : hasManualData
                          ? "Configure rental invoices"
                          : "Upload lease or enter tenant information manually"}
                    </CardDescription>
                  </div>
                  {state.tenants.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTenant(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lease Upload Section */}
                {!hasExtractedData && !hasManualData && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto flex-col items-start p-6"
                        onClick={() => {
                          const fileInput = document.createElement("input")
                          fileInput.type = "file"
                          fileInput.accept = ".pdf"
                          fileInput.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) handleFileChange(index, file)
                          }
                          fileInput.click()
                        }}
                      >
                        <FileText className="mb-2 h-8 w-8 text-blue-600" />
                        <div className="text-left">
                          <div className="font-semibold">Upload Lease Agreement</div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            Extract tenant information automatically from the lease document
                          </div>
                        </div>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto flex-col items-start p-6"
                        onClick={() => {
                          const updated = [...state.tenants]
                          if (!updated[index].manualData) {
                            updated[index].manualData = {
                              name: "",
                              idNumber: "",
                              email: "",
                              phone: "",
                              rentalAmount: undefined
                            }
                          }
                          updateTenants(updated)
                        }}
                      >
                        <UserPlus className="mb-2 h-8 w-8 text-green-600" />
                        <div className="text-left">
                          <div className="font-semibold">Manual Entry</div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            Enter tenant information manually
                          </div>
                        </div>
                      </Button>
                    </div>

                    {hasLeaseFile && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{tenant.leaseFile!.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({(tenant.leaseFile!.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              onClick={() => handleExtractFromLease(index)}
                              disabled={extracting[index]}
                              size="sm"
                            >
                              {extracting[index] ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Extracting...
                                </>
                              ) : (
                                "Extract Information"
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleFileChange(index, null)}
                              className="h-6 w-6"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Extracted Data Form (Editable) */}
                {hasExtractedData && (
                  <div className="space-y-4">
                    <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">
                          Information Extracted Successfully - You can edit any field below
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Tenant Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={tenant.extractedData?.name || ""}
                        onChange={(e) => updateExtractedData(index, "name", e.target.value)}
                        placeholder="Enter tenant full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        ID Number / Passport Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={tenant.extractedData?.idNumber || ""}
                        onChange={(e) => updateExtractedData(index, "idNumber", e.target.value)}
                        placeholder="Enter ID or passport number"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={tenant.extractedData?.email || ""}
                          onChange={(e) => updateExtractedData(index, "email", e.target.value)}
                          placeholder="Enter email address"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={tenant.extractedData?.phone || ""}
                          onChange={(e) => updateExtractedData(index, "phone", e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Monthly Rental Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={tenant.extractedData?.rentalAmount || ""}
                        onChange={(e) =>
                          updateExtractedData(index, "rentalAmount", e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        placeholder="Enter monthly rental amount"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Lease Start Date</Label>
                        <Input
                          type="date"
                          value={tenant.extractedData?.startDate || ""}
                          onChange={(e) => updateExtractedData(index, "startDate", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Lease End Date</Label>
                        <Input
                          type="date"
                          value={tenant.extractedData?.endDate || ""}
                          onChange={(e) => updateExtractedData(index, "endDate", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Entry Form */}
                {hasManualData && !hasExtractedData && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        Tenant Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={tenant.manualData?.name || ""}
                        onChange={(e) => updateTenantData(index, "name", e.target.value)}
                        placeholder="Enter tenant full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>
                        ID Number / Passport Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={tenant.manualData?.idNumber || ""}
                        onChange={(e) => updateTenantData(index, "idNumber", e.target.value)}
                        placeholder="Enter ID or passport number"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={tenant.manualData?.email || ""}
                          onChange={(e) => updateTenantData(index, "email", e.target.value)}
                          placeholder="Enter email address"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={tenant.manualData?.phone || ""}
                          onChange={(e) => updateTenantData(index, "phone", e.target.value)}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Monthly Rental Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={tenant.manualData?.rentalAmount || ""}
                        onChange={(e) =>
                          updateTenantData(index, "rentalAmount", e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        placeholder="Enter monthly rental amount"
                      />
                    </div>
                  </div>
                )}

                {/* Rental Invoice Template Configuration */}
                {(hasExtractedData || hasManualData) && (
                  <div className="pt-4 border-t">
                    <RentalInvoiceTemplatesConfig tenantIndex={index} />
                  </div>
                )}

                {/* Save Button */}
                {(hasExtractedData || hasManualData) && !tenant.tenantId && (
                  <div className="pt-4 border-t">
                    <Button
                      type="button"
                      onClick={() => handleSaveTenant(index)}
                      disabled={savingIndex === index}
                      className="w-full"
                    >
                      {savingIndex === index ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving Tenant...
                        </>
                      ) : (
                        "Save Tenant to Database"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {state.tenants.length > 0 && (
          <Button variant="outline" onClick={addTenant} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Another Tenant
          </Button>
        )}
      </div>
    </WizardStep>
  )
}

