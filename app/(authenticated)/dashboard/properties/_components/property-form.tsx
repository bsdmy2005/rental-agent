"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { createPropertyAction } from "@/actions/properties-actions"
import { toast } from "sonner"
import { SOUTH_AFRICAN_PROVINCES, COUNTRIES } from "@/lib/constants/south-africa"
import { generatePropertyName } from "@/lib/utils/property-name"

interface PropertyFormProps {
  landlordId: string
  onSuccess?: () => void
}

export function PropertyForm({ landlordId, onSuccess }: PropertyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    streetAddress: "",
    suburb: "",
    province: "",
    country: "South Africa",
    postalCode: "",
    propertyType: "",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    branchCode: "",
    swiftCode: "",
    referenceFormat: ""
  })
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)

  // Auto-generate property name when address fields change
  useEffect(() => {
    if (!nameManuallyEdited && formData.streetAddress && formData.suburb && formData.province) {
      const generatedName = generatePropertyName(
        formData.streetAddress,
        formData.suburb,
        formData.province,
        formData.postalCode
      )
      if (generatedName) {
        setFormData((prev) => ({ ...prev, name: generatedName }))
      }
    }
  }, [formData.streetAddress, formData.suburb, formData.province, formData.postalCode, nameManuallyEdited])

  const handleNameChange = (value: string) => {
    setNameManuallyEdited(true)
    setFormData((prev) => ({ ...prev, name: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createPropertyAction({
        landlordId,
        name: formData.name,
        streetAddress: formData.streetAddress,
        suburb: formData.suburb,
        province: formData.province,
        country: formData.country,
        postalCode: formData.postalCode || undefined,
        propertyType: formData.propertyType || undefined,
        bankName: formData.bankName || undefined,
        accountHolderName: formData.accountHolderName || undefined,
        accountNumber: formData.accountNumber || undefined,
        branchCode: formData.branchCode || undefined,
        swiftCode: formData.swiftCode || undefined,
        referenceFormat: formData.referenceFormat || undefined
      })

      if (result.isSuccess && result.data) {
        toast.success("Property created successfully!")
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirect to template setup page
          router.push(`/dashboard/properties/${result.data.id}/setup-templates`)
        }
        // Reset form
        setFormData({
          name: "",
          streetAddress: "",
          suburb: "",
          province: "",
          country: "South Africa",
          postalCode: "",
          propertyType: "",
          bankName: "",
          accountHolderName: "",
          accountNumber: "",
          branchCode: "",
          swiftCode: "",
          referenceFormat: ""
        })
        setNameManuallyEdited(false)
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="streetAddress" className="text-base font-medium">
              Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="streetAddress"
              required
              value={formData.streetAddress}
              onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
              placeholder="e.g., 123 Main Street"
              className="h-11"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="suburb" className="text-base font-medium">
                Suburb <span className="text-destructive">*</span>
              </Label>
              <Input
                id="suburb"
                required
                value={formData.suburb}
                onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                placeholder="e.g., Sandton"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-base font-medium">
                Postal Code
              </Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="e.g., 2196"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="province" className="text-base font-medium">
                Province <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.province}
                onValueChange={(value) => setFormData({ ...formData, province: value })}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {SOUTH_AFRICAN_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-base font-medium">
                Country <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
                required
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertyType" className="text-base font-medium">
              Property Type
            </Label>
            <Input
              id="propertyType"
              placeholder="e.g., Apartment, House, Townhouse"
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              className="h-11"
            />
            <p className="text-muted-foreground text-xs">
              Optional: Specify the type of property
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">
              Property Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Auto-generated from address or enter manually"
              className="h-11"
            />
            <p className="text-muted-foreground text-xs">
              Name will be auto-generated from address fields, but you can edit it
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Payment Instructions (Banking Details)</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Optional: Add banking details that will appear on rental invoices
            </p>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g., Standard Bank"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                    placeholder="Name on account"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Account number"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branchCode">Branch Code</Label>
                  <Input
                    id="branchCode"
                    value={formData.branchCode}
                    onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                    placeholder="e.g., 000123"
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="swiftCode">Swift Code</Label>
                  <Input
                    id="swiftCode"
                    value={formData.swiftCode}
                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                    placeholder="e.g., SBZAZAJJ"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceFormat">Reference Format</Label>
                  <Input
                    id="referenceFormat"
                    value={formData.referenceFormat}
                    onChange={(e) => setFormData({ ...formData, referenceFormat: e.target.value })}
                    placeholder="e.g., Use invoice number as reference"
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading} size="lg" className="min-w-[140px]">
              {loading ? "Creating..." : "Create Property"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

