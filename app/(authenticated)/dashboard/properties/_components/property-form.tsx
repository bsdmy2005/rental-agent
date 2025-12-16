"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPropertyAction } from "@/actions/properties-actions"
import { toast } from "sonner"

interface PropertyFormProps {
  landlordId: string
  onSuccess?: () => void
}

export function PropertyForm({ landlordId, onSuccess }: PropertyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    propertyType: "",
    rentalAmount: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createPropertyAction({
        landlordId,
        name: formData.name,
        address: formData.address,
        propertyType: formData.propertyType || undefined,
        rentalAmount: formData.rentalAmount ? formData.rentalAmount : undefined
      })

      if (result.isSuccess) {
        toast.success("Property created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          router.refresh()
        }
        // Reset form
        setFormData({ name: "", address: "", propertyType: "", rentalAmount: "" })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to create property")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Property Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="propertyType">Property Type</Label>
        <Input
          id="propertyType"
          placeholder="e.g., Apartment, House"
          value={formData.propertyType}
          onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="rentalAmount">Monthly Rental Amount (ZAR)</Label>
        <Input
          id="rentalAmount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.rentalAmount}
          onChange={(e) => setFormData({ ...formData, rentalAmount: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Property"}
      </Button>
    </form>
  )
}

