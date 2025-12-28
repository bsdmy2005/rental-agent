"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export default function NewLeasePage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.propertyId as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [tenantType, setTenantType] = useState<"existing" | "new">("new")
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; isDefault: boolean }>>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [formData, setFormData] = useState({
    templateId: "",
    tenantId: "",
    tenantName: "",
    tenantEmail: "",
    tenantIdNumber: "",
    tenantPhone: "",
    tenantAddress: "",
    landlordName: "",
    landlordIdNumber: "",
    landlordAddress: "",
    landlordEmail: "",
    landlordPhone: "",
    landlordBankName: "",
    landlordAccountHolder: "",
    landlordAccountNumber: "",
    landlordBranchCode: "",
    leaseStartDate: "",
    leaseEndDate: "",
    monthlyRental: "",
    depositAmount: "",
    paymentMethod: "",
    escalationType: "none",
    escalationPercentage: "",
    escalationFixedAmount: "",
    specialConditions: "",
    sendToTenant: true
  })
  const [landlordDetailsLoaded, setLandlordDetailsLoaded] = useState(false)

  useEffect(() => {
    async function fetchTenants() {
      try {
        const response = await fetch(`/api/properties/${propertyId}/tenants`)
        if (response.ok) {
          const data = await response.json()
          setTenants(data)
          // If tenants exist, default to "existing" and select first one
          if (data.length > 0) {
            setTenantType("existing")
            setFormData(prev => ({ ...prev, tenantId: data[0].id }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch tenants:", err)
      } finally {
        setLoadingTenants(false)
      }
    }

    async function fetchTemplates() {
      try {
        const response = await fetch("/api/lease-templates")
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates || [])
          // Select default template if available
          const defaultTemplate = data.templates?.find((t: any) => t.isDefault)
          if (defaultTemplate) {
            setFormData(prev => ({ ...prev, templateId: defaultTemplate.id }))
          } else if (data.templates?.length > 0) {
            setFormData(prev => ({ ...prev, templateId: data.templates[0].id }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err)
      } finally {
        setLoadingTemplates(false)
      }
    }

    async function fetchLandlordDetails() {
      try {
        // First, try to fetch property-specific landlord details
        const propertyResponse = await fetch(`/api/properties/${propertyId}`)
        if (propertyResponse.ok) {
          const propertyData = await propertyResponse.json()
          if (propertyData.landlordName || propertyData.landlordEmail || propertyData.landlordPhone) {
            // Property has landlord details - use those
            setFormData(prev => ({
              ...prev,
              landlordName: propertyData.landlordName || prev.landlordName || "",
              landlordIdNumber: propertyData.landlordIdNumber || prev.landlordIdNumber || "",
              landlordAddress: propertyData.landlordAddress || prev.landlordAddress || "",
              landlordEmail: propertyData.landlordEmail || prev.landlordEmail || "",
              landlordPhone: propertyData.landlordPhone || prev.landlordPhone || "",
              landlordBankName: propertyData.bankName || prev.landlordBankName || "",
              landlordAccountHolder: propertyData.accountHolderName || prev.landlordAccountHolder || "",
              landlordAccountNumber: propertyData.accountNumber || prev.landlordAccountNumber || "",
              landlordBranchCode: propertyData.branchCode || prev.landlordBranchCode || ""
            }))
            setLandlordDetailsLoaded(true)
            return // Don't fallback to user landlord details if property has them
          }
        }
        
        // Fallback: fetch from user profile if property doesn't have landlord details
        const response = await fetch("/api/user/landlord-details")
        if (response.ok) {
          const data = await response.json()
          if (data.landlord) {
            setFormData(prev => ({
              ...prev,
              landlordName: prev.landlordName || data.landlord.name || "",
              landlordIdNumber: prev.landlordIdNumber || data.landlord.idNumber || "",
              landlordAddress: prev.landlordAddress || data.landlord.address || "",
              landlordEmail: prev.landlordEmail || data.landlord.email || "",
              landlordPhone: prev.landlordPhone || data.landlord.phone || "",
              landlordBankName: prev.landlordBankName || data.landlord.bankName || "",
              landlordAccountHolder: prev.landlordAccountHolder || data.landlord.accountHolder || "",
              landlordAccountNumber: prev.landlordAccountNumber || data.landlord.accountNumber || "",
              landlordBranchCode: prev.landlordBranchCode || data.landlord.branchCode || ""
            }))
          }
        }
      } catch (err) {
        console.error("Failed to fetch landlord details:", err)
      } finally {
        setLandlordDetailsLoaded(true)
      }
    }

    if (propertyId) {
      fetchTenants()
      fetchTemplates()
      fetchLandlordDetails()
    }
  }, [propertyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/leases/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyId,
          templateId: formData.templateId || undefined,
          ...(tenantType === "existing" ? { tenantId: formData.tenantId } : {
            tenantName: formData.tenantName,
            tenantEmail: formData.tenantEmail,
            tenantIdNumber: formData.tenantIdNumber,
            tenantPhone: formData.tenantPhone || undefined,
            tenantAddress: formData.tenantAddress || undefined
          }),
          landlordName: formData.landlordName,
          landlordIdNumber: formData.landlordIdNumber,
          landlordAddress: formData.landlordAddress,
          landlordEmail: formData.landlordEmail,
          landlordPhone: formData.landlordPhone,
          landlordBankDetails: (formData.landlordBankName || formData.landlordAccountNumber) ? {
            bankName: formData.landlordBankName || undefined,
            accountHolderName: formData.landlordAccountHolder || undefined,
            accountNumber: formData.landlordAccountNumber || undefined,
            branchCode: formData.landlordBranchCode || undefined
          } : undefined,
          leaseStartDate: formData.leaseStartDate,
          leaseEndDate: formData.leaseEndDate,
          monthlyRental: Number(formData.monthlyRental),
          depositAmount: formData.depositAmount ? Number(formData.depositAmount) : undefined,
          paymentMethod: formData.paymentMethod || undefined,
          escalationType: formData.escalationType,
          escalationPercentage: formData.escalationPercentage ? Number(formData.escalationPercentage) : undefined,
          escalationFixedAmount: formData.escalationFixedAmount ? Number(formData.escalationFixedAmount) : undefined,
          specialConditions: formData.specialConditions || undefined,
          sendToTenant: formData.sendToTenant
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to initiate lease")
        return
      }

      // Success - redirect to lease detail or property page
      router.push(`/dashboard/properties/${propertyId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate lease")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/properties/${propertyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Initiate New Lease</h1>
          <p className="text-muted-foreground mt-1">
            Create a new lease agreement and send it to the tenant for signing.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lease Template</CardTitle>
            <CardDescription>Select a template for this lease agreement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingTemplates ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                No templates available.{" "}
                <Link href="/dashboard/lease-templates/new" className="text-primary hover:underline">
                  Create a template
                </Link>{" "}
                first.
              </div>
            ) : (
              <div>
                <Label>Template *</Label>
                <Select
                  value={formData.templateId}
                  onValueChange={(value) => setFormData({ ...formData, templateId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link href="/dashboard/lease-templates" className="text-sm text-primary hover:underline mt-2 block">
                  Manage templates →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
            <CardDescription>Select an existing tenant or create a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tenant Type</Label>
              <Select value={tenantType} onValueChange={(v) => setTenantType(v as "existing" | "new")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Tenant</SelectItem>
                  <SelectItem value="existing">Existing Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tenantType === "existing" ? (
              <div>
                <Label>Select Tenant</Label>
                {loadingTenants ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading tenants...</span>
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 border rounded-lg">
                    No existing tenants found for this property. Please create a new tenant.
                  </div>
                ) : (
                  <Select
                    value={formData.tenantId}
                    onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} {tenant.email && `(${tenant.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <>
                <div>
                  <Label>Tenant Name *</Label>
                  <Input
                    value={formData.tenantName}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>ID Number *</Label>
                  <Input
                    value={formData.tenantIdNumber}
                    onChange={(e) => setFormData({ ...formData, tenantIdNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.tenantEmail}
                    onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={formData.tenantPhone}
                    onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={formData.tenantAddress}
                    onChange={(e) => setFormData({ ...formData, tenantAddress: e.target.value })}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Landlord Information</CardTitle>
            <CardDescription>Complete all required landlord details for the lease agreement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!landlordDetailsLoaded ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading landlord details...</span>
              </div>
            ) : (
              <>
                <div>
                  <Label>Landlord/Company Name *</Label>
                  <Input
                    value={formData.landlordName}
                    onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
                    required
                    placeholder="Company name or individual name"
                  />
                </div>
                <div>
                  <Label>ID/Registration Number *</Label>
                  <Input
                    value={formData.landlordIdNumber}
                    onChange={(e) => setFormData({ ...formData, landlordIdNumber: e.target.value })}
                    required
                    placeholder="ID number, registration number, or tax ID"
                  />
                </div>
                <div>
                  <Label>Address *</Label>
                  <Textarea
                    value={formData.landlordAddress}
                    onChange={(e) => setFormData({ ...formData, landlordAddress: e.target.value })}
                    required
                    placeholder="Full address"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.landlordEmail}
                    onChange={(e) => setFormData({ ...formData, landlordEmail: e.target.value })}
                    required
                    placeholder="landlord@example.com"
                  />
                </div>
                <div>
                  <Label>Contact Number *</Label>
                  <Input
                    type="tel"
                    value={formData.landlordPhone}
                    onChange={(e) => setFormData({ ...formData, landlordPhone: e.target.value })}
                    required
                    placeholder="+27 XX XXX XXXX"
                  />
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-4">Banking Details (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Name</Label>
                      <Input
                        value={formData.landlordBankName}
                        onChange={(e) => setFormData({ ...formData, landlordBankName: e.target.value })}
                        placeholder="e.g., Standard Bank"
                      />
                    </div>
                    <div>
                      <Label>Account Holder Name</Label>
                      <Input
                        value={formData.landlordAccountHolder}
                        onChange={(e) => setFormData({ ...formData, landlordAccountHolder: e.target.value })}
                        placeholder="Account holder name"
                      />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input
                        value={formData.landlordAccountNumber}
                        onChange={(e) => setFormData({ ...formData, landlordAccountNumber: e.target.value })}
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <Label>Branch Code</Label>
                      <Input
                        value={formData.landlordBranchCode}
                        onChange={(e) => setFormData({ ...formData, landlordBranchCode: e.target.value })}
                        placeholder="Branch code"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lease Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.leaseStartDate}
                  onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.leaseEndDate}
                  onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Monthly Rental (R) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monthlyRental}
                onChange={(e) => setFormData({ ...formData, monthlyRental: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Deposit Amount (R)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Input
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                placeholder="e.g., EFT, Debit Order"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Escalation Type</Label>
              <Select
                value={formData.escalationType}
                onValueChange={(v) => setFormData({ ...formData, escalationType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  <SelectItem value="cpi">CPI-Linked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.escalationType === "percentage" && (
              <div>
                <Label>Escalation Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.escalationPercentage}
                  onChange={(e) => setFormData({ ...formData, escalationPercentage: e.target.value })}
                />
              </div>
            )}
            {formData.escalationType === "fixed_amount" && (
              <div>
                <Label>Escalation Amount (R)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.escalationFixedAmount}
                  onChange={(e) => setFormData({ ...formData, escalationFixedAmount: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Special Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.specialConditions}
              onChange={(e) => setFormData({ ...formData, specialConditions: e.target.value })}
              placeholder="Any special conditions or terms..."
              rows={4}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Lease...
              </>
            ) : (
              "Create Lease & Send to Tenant"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

