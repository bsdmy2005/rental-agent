"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { BillUpload } from "./bill-upload"

interface BillUploadWrapperProps {
  properties: Array<{ id: string; name: string }>
}

export function BillUploadWrapper({ properties }: BillUploadWrapperProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Select Property</label>
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedPropertyId && <BillUpload propertyId={selectedPropertyId} />}
    </div>
  )
}

