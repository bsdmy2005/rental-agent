"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { WizardStep } from "../wizard-step"
import { useWizardState } from "../wizard-state"
import { SOUTH_AFRICAN_PROVINCES, COUNTRIES } from "@/lib/constants/south-africa"
import { generatePropertyName } from "@/lib/utils/property-name"

export function PropertyDetailsStep() {
  const { state, updateProperty } = useWizardState()
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false)

  // Auto-generate property name when address fields change
  useEffect(() => {
    if (!nameManuallyEdited && state.property.streetAddress && state.property.suburb && state.property.province) {
      const generatedName = generatePropertyName(
        state.property.streetAddress,
        state.property.suburb,
        state.property.province,
        state.property.postalCode
      )
      // Only update if the generated name is different from current name
      if (generatedName && generatedName !== state.property.name) {
        updateProperty({ name: generatedName })
      }
    }
  }, [state.property.streetAddress, state.property.suburb, state.property.province, state.property.postalCode, state.property.name, nameManuallyEdited, updateProperty])

  const handleNameChange = (value: string) => {
    setNameManuallyEdited(true)
    updateProperty({ name: value })
  }

  return (
    <WizardStep
      title="Step 1: Property Details"
      description="Enter the basic information for your property"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="streetAddress" className="text-base font-medium">
            Street Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="streetAddress"
            required
            value={state.property.streetAddress}
            onChange={(e) => updateProperty({ streetAddress: e.target.value })}
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
              value={state.property.suburb}
              onChange={(e) => updateProperty({ suburb: e.target.value })}
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
              value={state.property.postalCode || ""}
              onChange={(e) => updateProperty({ postalCode: e.target.value })}
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
              value={state.property.province}
              onValueChange={(value) => updateProperty({ province: value })}
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
              value={state.property.country}
              onValueChange={(value) => updateProperty({ country: value })}
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
            value={state.property.propertyType || ""}
            onChange={(e) => updateProperty({ propertyType: e.target.value })}
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
            value={state.property.name}
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
                  value={state.property.bankName || ""}
                  onChange={(e) => updateProperty({ bankName: e.target.value })}
                  placeholder="e.g., Standard Bank"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  value={state.property.accountHolderName || ""}
                  onChange={(e) => updateProperty({ accountHolderName: e.target.value })}
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
                  value={state.property.accountNumber || ""}
                  onChange={(e) => updateProperty({ accountNumber: e.target.value })}
                  placeholder="Account number"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchCode">Branch Code</Label>
                <Input
                  id="branchCode"
                  value={state.property.branchCode || ""}
                  onChange={(e) => updateProperty({ branchCode: e.target.value })}
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
                  value={state.property.swiftCode || ""}
                  onChange={(e) => updateProperty({ swiftCode: e.target.value })}
                  placeholder="e.g., SBZAZAJJ"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceFormat">Reference Format</Label>
                <Input
                  id="referenceFormat"
                  value={state.property.referenceFormat || ""}
                  onChange={(e) => updateProperty({ referenceFormat: e.target.value })}
                  placeholder="e.g., Use invoice number as reference"
                  className="h-11"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Property Owner Details</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Enter the property owner's contact information. This is required for contracts and communication.
          </p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="landlordName">
                  Owner Name / Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="landlordName"
                  required
                  value={state.property.landlordName || ""}
                  onChange={(e) => updateProperty({ landlordName: e.target.value })}
                  placeholder="e.g., John Smith or ABC Properties Ltd"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlordIdNumber">
                  ID / Registration Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="landlordIdNumber"
                  required
                  value={state.property.landlordIdNumber || ""}
                  onChange={(e) => updateProperty({ landlordIdNumber: e.target.value })}
                  placeholder="ID number or company registration"
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="landlordEmail">
                  Owner Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="landlordEmail"
                  type="email"
                  required
                  value={state.property.landlordEmail || ""}
                  onChange={(e) => updateProperty({ landlordEmail: e.target.value })}
                  placeholder="owner@example.com"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlordPhone">
                  Owner Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="landlordPhone"
                  type="tel"
                  required
                  value={state.property.landlordPhone || ""}
                  onChange={(e) => updateProperty({ landlordPhone: e.target.value })}
                  placeholder="+27 12 345 6789"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="landlordAddress">
                Owner Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="landlordAddress"
                required
                value={state.property.landlordAddress || ""}
                onChange={(e) => updateProperty({ landlordAddress: e.target.value })}
                placeholder="Full address of the property owner"
                className="h-11"
              />
            </div>
          </div>
        </div>
      </div>
    </WizardStep>
  )
}

