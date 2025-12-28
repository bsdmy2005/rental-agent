"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Check, X, User } from "lucide-react"
import { SelectProperty } from "@/db/schema"
import { updatePropertyAction } from "@/actions/properties-actions"
import { toast } from "sonner"

interface PropertyLandlordDetailsSectionProps {
  property: SelectProperty
}

export function PropertyLandlordDetailsSection({ property }: PropertyLandlordDetailsSectionProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    landlordName: property.landlordName || "",
    landlordEmail: property.landlordEmail || "",
    landlordPhone: property.landlordPhone || "",
    landlordIdNumber: property.landlordIdNumber || "",
    landlordAddress: property.landlordAddress || ""
  })

  const hasLandlordDetails =
    property.landlordName ||
    property.landlordEmail ||
    property.landlordPhone ||
    property.landlordIdNumber ||
    property.landlordAddress

  // Fetch landlord details from API when editing starts
  useEffect(() => {
    if (isEditing && !hasLandlordDetails) {
      async function fetchLandlordDetails() {
        try {
          const response = await fetch("/api/user/landlord-details")
          if (response.ok) {
            const data = await response.json()
            if (data.landlord) {
              setFormData(prev => ({
                ...prev,
                landlordName: prev.landlordName || data.landlord.name || "",
                landlordEmail: prev.landlordEmail || data.landlord.email || "",
                landlordPhone: prev.landlordPhone || data.landlord.phone || "",
                landlordIdNumber: prev.landlordIdNumber || data.landlord.idNumber || "",
                landlordAddress: prev.landlordAddress || data.landlord.address || ""
              }))
            }
          }
        } catch (err) {
          console.error("Failed to fetch landlord details:", err)
        }
      }
      fetchLandlordDetails()
    }
  }, [isEditing, hasLandlordDetails])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updatePropertyAction(property.id, {
        landlordName: formData.landlordName || undefined,
        landlordEmail: formData.landlordEmail || undefined,
        landlordPhone: formData.landlordPhone || undefined,
        landlordIdNumber: formData.landlordIdNumber || undefined,
        landlordAddress: formData.landlordAddress || undefined
      })

      if (result.isSuccess) {
        toast.success("Landlord details updated successfully!")
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update landlord details")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      landlordName: property.landlordName || "",
      landlordEmail: property.landlordEmail || "",
      landlordPhone: property.landlordPhone || "",
      landlordIdNumber: property.landlordIdNumber || "",
      landlordAddress: property.landlordAddress || ""
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="landlordName">
            Landlord Name / Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="landlordName"
            required
            value={formData.landlordName}
            onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
            placeholder="Full name or company name"
            className="h-10"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="landlordEmail">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="landlordEmail"
              type="email"
              required
              value={formData.landlordEmail}
              onChange={(e) => setFormData({ ...formData, landlordEmail: e.target.value })}
              placeholder="landlord@example.com"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landlordPhone">
              Contact Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="landlordPhone"
              type="tel"
              required
              value={formData.landlordPhone}
              onChange={(e) => setFormData({ ...formData, landlordPhone: e.target.value })}
              placeholder="+27 12 345 6789"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="landlordIdNumber">
            ID / Registration Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="landlordIdNumber"
            required
            value={formData.landlordIdNumber}
            onChange={(e) => setFormData({ ...formData, landlordIdNumber: e.target.value })}
            placeholder="ID number or company registration number"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="landlordAddress">
            Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="landlordAddress"
            required
            value={formData.landlordAddress}
            onChange={(e) => setFormData({ ...formData, landlordAddress: e.target.value })}
            placeholder="Full address"
            className="h-10"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            <Check className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
          disabled={loading}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {hasLandlordDetails ? "Edit" : "Add"}
        </Button>
      </div>
      <div>
        {hasLandlordDetails ? (
          <div className="space-y-3">
            {property.landlordName && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name:</span>
                <p className="text-sm">{property.landlordName}</p>
              </div>
            )}
            {property.landlordEmail && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="text-sm">{property.landlordEmail}</p>
              </div>
            )}
            {property.landlordPhone && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Contact Number:</span>
                <p className="text-sm">{property.landlordPhone}</p>
              </div>
            )}
            {property.landlordIdNumber && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">ID / Registration Number:</span>
                <p className="text-sm">{property.landlordIdNumber}</p>
              </div>
            )}
            {property.landlordAddress && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Address:</span>
                <p className="text-sm">{property.landlordAddress}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">No landlord details configured</p>
            <p className="text-xs text-muted-foreground">
              Add landlord contact details for contracts and communication. These details will be used in lease agreements.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

