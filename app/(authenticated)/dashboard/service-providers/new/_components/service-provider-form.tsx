"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MultiSelectArea, type SelectedArea } from "@/components/ui/multi-select-area"
import { createServiceProviderAction } from "@/actions/service-providers-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ServiceProviderFormProps {
  createdBy: string // userProfileId
  onSuccess?: () => void
}

export function ServiceProviderForm({ createdBy, onSuccess }: ServiceProviderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState<SelectedArea[]>([])

  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    whatsappNumber: "",
    email: "",
    specialization: "" as
      | "plumbing"
      | "electrical"
      | "hvac"
      | "general_maintenance"
      | "painting"
      | "carpentry"
      | "roofing"
      | "other"
      | "",
    licenseNumber: "",
    insuranceInfo: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate that at least one area with suburb is selected
      if (selectedAreas.length === 0) {
        toast.error("Please select at least one service area with a suburb")
        setLoading(false)
        return
      }

      // Validate that all areas have suburbs
      const areasWithoutSuburbs = selectedAreas.filter((area) => !area.suburb)
      if (areasWithoutSuburbs.length > 0) {
        toast.error("All service areas must have a suburb selected")
        setLoading(false)
        return
      }

      // Convert SelectedArea[] to the format expected by the action
      const areas = selectedAreas.map((area) => ({
        suburb: area.suburb!,
        city: area.city,
        province: area.province,
        country: "South Africa" as const
      }))

      const result = await createServiceProviderAction(
        {
          businessName: formData.businessName || null,
          contactName: formData.contactName,
          phone: formData.phone || null,
          whatsappNumber: formData.whatsappNumber || null,
          email: formData.email,
          specialization: formData.specialization || null,
          licenseNumber: formData.licenseNumber || null,
          insuranceInfo: formData.insuranceInfo || null,
          isActive: true,
          createdBy
        },
        areas
      )

      if (result.isSuccess) {
        toast.success("Service provider added successfully")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push("/dashboard/service-providers")
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error creating service provider:", error)
      toast.error("Failed to create service provider")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Service Provider</CardTitle>
        <CardDescription>Add a new service provider to your directory</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              required
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="ABC Plumbing Services"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="provider@example.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+27 11 123 4567"
            />
          </div>

          <div>
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input
              id="whatsappNumber"
              type="tel"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              placeholder="+27 11 123 4567"
            />
          </div>

          <div>
            <Label htmlFor="specialization">Specialization</Label>
            <Select
              value={formData.specialization}
              onValueChange={(value: any) => setFormData({ ...formData, specialization: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select specialization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="general_maintenance">General Maintenance</SelectItem>
                <SelectItem value="painting">Painting</SelectItem>
                <SelectItem value="carpentry">Carpentry</SelectItem>
                <SelectItem value="roofing">Roofing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="insuranceInfo">Insurance Information</Label>
            <Textarea
              id="insuranceInfo"
              value={formData.insuranceInfo}
              onChange={(e) => setFormData({ ...formData, insuranceInfo: e.target.value })}
              placeholder="Insurance details..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <Label className="text-base font-semibold mb-2 block">
              Service Areas <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Select at least one area with a suburb where this service provider operates. Service providers must be tied to specific neighborhoods.
            </p>
            <MultiSelectArea value={selectedAreas} onChange={setSelectedAreas} />
            {selectedAreas.length > 0 && selectedAreas.some((area) => !area.suburb) && (
              <p className="text-sm text-destructive mt-2">
                All selected areas must have a suburb specified.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Provider
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

