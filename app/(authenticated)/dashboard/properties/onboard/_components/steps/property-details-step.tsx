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
      </div>
    </WizardStep>
  )
}

