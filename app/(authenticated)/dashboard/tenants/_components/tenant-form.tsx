"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
          router.refresh()
        }
        // Reset form
        setFormData({
          name: "",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Tenant Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="leaseStartDate">Lease Start Date</Label>
        <Input
          id="leaseStartDate"
          type="date"
          value={formData.leaseStartDate}
          onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="leaseEndDate">Lease End Date</Label>
        <Input
          id="leaseEndDate"
          type="date"
          value={formData.leaseEndDate}
          onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Tenant"}
      </Button>
    </form>
  )
}

