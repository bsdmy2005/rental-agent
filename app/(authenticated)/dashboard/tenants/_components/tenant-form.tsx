"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createTenantAction } from "@/actions/tenants-actions"
import { toast } from "sonner"
import { FileText, Upload, X, Calendar, CheckCircle2, UserPlus } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface TenantFormProps {
  propertyId: string
  onSuccess?: () => void
  userType?: "landlord" | "rental_agent" | "tenant" | "admin" // User type to show/hide certain options
}

type OnboardingStep = "initial" | "lease-upload" | "manual-entry"

export function TenantForm({ propertyId, onSuccess, userType }: TenantFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>("initial")
  const [loading, setLoading] = useState(false)
  const [leaseFile, setLeaseFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<{
    tenantName?: string
    tenantIdNumber?: string
    tenantEmail?: string
    tenantPhone?: string
    rentalAmount?: number
    startDate?: string
    endDate?: string
  } | null>(null)
  const [uploadingLease, setUploadingLease] = useState(false)
  const [markAsFullyExecuted, setMarkAsFullyExecuted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    idNumber: "",
    rentalAmount: "",
    email: "",
    phone: "",
    leaseStartDate: "",
    leaseEndDate: ""
  })

  const handleExtractFromLease = async () => {
    if (!leaseFile) {
      toast.error("Please select a lease file first")
      return
    }

    setExtracting(true)
    try {
      const formData = new FormData()
      formData.append("file", leaseFile)

      const response = await fetch("/api/lease-agreements/extract-tenant", {
        method: "POST",
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to extract tenant data")
      }

      const data = result.data

      // Pre-fill form with extracted data
      setExtractedData(data)
      setFormData({
        name: data.tenantName || "",
        idNumber: data.tenantIdNumber || "",
        rentalAmount: data.rentalAmount ? String(data.rentalAmount) : "",
        email: data.tenantEmail || "",
        phone: data.tenantPhone || "",
        leaseStartDate: data.startDate || "",
        leaseEndDate: data.endDate || ""
      })

      toast.success("Tenant information extracted from lease!")
    } catch (error) {
      console.error("Error extracting tenant data:", error)
      toast.error(error instanceof Error ? error.message : "Failed to extract tenant data")
    } finally {
      setExtracting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Only PDF files are allowed")
        return
      }
      setLeaseFile(file)
      setExtractedData(null) // Reset extracted data when new file is selected
    }
  }

  const handleUploadLease = async (tenantId: string) => {
    if (!leaseFile) return

    setUploadingLease(true)
    try {
      const formData = new FormData()
      formData.append("file", leaseFile)
      formData.append("tenantId", tenantId)
      formData.append("propertyId", propertyId)
      if (markAsFullyExecuted && (userType === "rental_agent" || userType === "landlord")) {
        formData.append("markAsFullyExecuted", "true")
      }

      const response = await fetch("/api/lease-agreements/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload lease agreement")
      }

      toast.success("Lease agreement uploaded successfully!")
    } catch (error) {
      console.error("Error uploading lease:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload lease agreement")
    } finally {
      setUploadingLease(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create tenant first
      const result = await createTenantAction({
        propertyId,
        name: formData.name,
        idNumber: formData.idNumber,
        rentalAmount: formData.rentalAmount ? formData.rentalAmount : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        leaseStartDate: formData.leaseStartDate ? new Date(formData.leaseStartDate) : undefined,
        leaseEndDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : undefined
      })

      if (result.isSuccess && result.data) {
        // If lease file is provided, upload it
        if (leaseFile) {
          await handleUploadLease(result.data.id)
        }

        toast.success("Tenant created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push("/dashboard/tenants")
        }
        // Reset form
        setStep("initial")
        setFormData({
          name: "",
          idNumber: "",
          rentalAmount: "",
          email: "",
          phone: "",
          leaseStartDate: "",
          leaseEndDate: ""
        })
        setLeaseFile(null)
        setExtractedData(null)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create tenant")
    } finally {
      setLoading(false)
    }
  }

  // Initial step: Ask if user has a lease
  if (step === "initial") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add New Tenant</CardTitle>
          <CardDescription>Choose how you want to add the tenant information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start p-6"
              onClick={() => setStep("lease-upload")}
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
              onClick={() => setStep("manual-entry")}
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
        </CardContent>
      </Card>
    )
  }

  // Lease upload step
  if (step === "lease-upload") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload Lease Agreement</CardTitle>
              <CardDescription>Upload the lease PDF to extract tenant information</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("initial")}>
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="lease-file" className="text-base font-medium">
              Lease Agreement PDF
            </Label>
            <div className="space-y-2">
              <Input
                id="lease-file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={extracting}
              />
              {leaseFile && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{leaseFile.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({(leaseFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setLeaseFile(null)
                      setExtractedData(null)
                    }}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={handleExtractFromLease}
              disabled={!leaseFile || extracting}
              className="w-full"
            >
              {extracting ? "Extracting..." : "Extract Tenant Information"}
            </Button>
            {(userType === "rental_agent" || userType === "landlord") && (
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <Checkbox
                  id="mark-as-fully-executed"
                  checked={markAsFullyExecuted}
                  onCheckedChange={(checked) => setMarkAsFullyExecuted(checked === true)}
                />
                <Label
                  htmlFor="mark-as-fully-executed"
                  className="text-sm font-normal cursor-pointer"
                >
                  Mark lease as fully executed (both parties have signed)
                </Label>
              </div>
            )}
          </div>

          {extractedData && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Information Extracted Successfully
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                Review and edit the extracted information below before creating the tenant.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("manual-entry")}
                className="w-full"
              >
                Continue to Review & Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Manual entry step (also used after extraction)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {extractedData ? "Review & Edit Tenant Information" : "Enter Tenant Information"}
            </CardTitle>
            <CardDescription>
              {extractedData
                ? "Review the extracted information and make any necessary changes"
                : "Enter the tenant details manually"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("initial")}>
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {extractedData && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  <FileText className="mr-1 h-3 w-3" />
                  Extracted from Lease
                </Badge>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Information was automatically extracted from the lease document. You can edit any field below.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">
              Tenant Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter tenant full name"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="idNumber" className="text-base font-medium">
              ID Number / Passport Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="idNumber"
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              placeholder="Enter ID number or passport number"
              className="h-11"
            />
            <p className="text-muted-foreground text-xs">
              Required: Used to uniquely identify the tenant
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentalAmount" className="text-base font-medium">
              Monthly Rental Amount
            </Label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                ZAR
              </span>
              <Input
                id="rentalAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.rentalAmount}
                onChange={(e) => setFormData({ ...formData, rentalAmount: e.target.value })}
                className="h-11 pl-12"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Optional: Monthly rental amount for this tenant on this property
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tenant@example.com"
              className="h-11"
            />
            <p className="text-muted-foreground text-xs">
              Optional: Tenant contact email address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+27 12 345 6789"
              className="h-11"
            />
            <p className="text-muted-foreground text-xs">
              Optional: Tenant contact phone number
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Lease Period
              </Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leaseStartDate" className="text-base font-medium">
                  Lease Start Date
                </Label>
                <Input
                  id="leaseStartDate"
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaseEndDate" className="text-base font-medium">
                  Lease End Date
                </Label>
                <Input
                  id="leaseEndDate"
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Lease period dates. {extractedData ? "Extracted from lease agreement." : "Enter manually."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("initial")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} size="lg" className="min-w-[140px]">
              {loading ? "Creating..." : "Create Tenant"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
