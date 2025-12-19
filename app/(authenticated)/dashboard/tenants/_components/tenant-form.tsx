"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createTenantAction } from "@/actions/tenants-actions"
import { toast } from "sonner"

interface TenantFormProps {
  propertyId: string
  onSuccess?: () => void
}

export function TenantForm({ propertyId, onSuccess }: TenantFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    idNumber: "",
    rentalAmount: "",
    email: "",
    phone: "",
    leaseStartDate: "",
    leaseEndDate: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
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

      if (result.isSuccess) {
        toast.success("Tenant created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push("/dashboard/tenants")
        }
        // Reset form
        setFormData({
          name: "",
          idNumber: "",
          rentalAmount: "",
          email: "",
          phone: "",
          leaseStartDate: "",
          leaseEndDate: ""
        })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create tenant")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            Optional: Lease period dates
          </p>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading} size="lg" className="min-w-[140px]">
              {loading ? "Creating..." : "Create Tenant"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

