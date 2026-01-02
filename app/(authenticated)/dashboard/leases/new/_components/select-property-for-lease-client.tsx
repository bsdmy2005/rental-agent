"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface SelectPropertyForLeaseClientProps {
  properties: Array<{ id: string; name: string; streetAddress: string; suburb: string; province: string }>
}

export function SelectPropertyForLeaseClient({ properties }: SelectPropertyForLeaseClientProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const router = useRouter()

  const handleContinue = () => {
    if (selectedPropertyId) {
      router.push(`/dashboard/properties/${selectedPropertyId}/leases/new`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Property</CardTitle>
        <CardDescription>
          Choose the property for which you want to generate a new lease document.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="property">Property *</Label>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger id="property">
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name} - {property.streetAddress}, {property.suburb}, {property.province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Link href="/dashboard/leases">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
          <Button onClick={handleContinue} disabled={!selectedPropertyId}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

