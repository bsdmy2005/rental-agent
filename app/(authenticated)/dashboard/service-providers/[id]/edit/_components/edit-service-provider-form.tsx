"use client"

import { useState, useEffect } from "react"
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
import {
  updateServiceProviderAction,
  getServiceProviderAreasAction
} from "@/actions/service-providers-actions"
import type { SelectServiceProvider, SelectServiceProviderArea } from "@/db/schema"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EditServiceProviderFormProps {
  provider: SelectServiceProvider
  onSuccess?: () => void
}

// Extended SelectedArea with id for tracking existing areas
interface SelectedAreaWithId extends SelectedArea {
  id?: string
}

export function EditServiceProviderForm({
  provider,
  onSuccess
}: EditServiceProviderFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingAreas, setLoadingAreas] = useState(true)
  const [selectedAreas, setSelectedAreas] = useState<SelectedAreaWithId[]>([])

  const [formData, setFormData] = useState({
    businessName: provider.businessName || "",
    contactName: provider.contactName,
    phone: provider.phone || "",
    whatsappNumber: provider.whatsappNumber || "",
    email: provider.email,
    specialization: (provider.specialization || "") as
      | "plumbing"
      | "electrical"
      | "hvac"
      | "general_maintenance"
      | "painting"
      | "carpentry"
      | "roofing"
      | "other"
      | "",
    licenseNumber: provider.licenseNumber || "",
    insuranceInfo: provider.insuranceInfo || "",
    isActive: provider.isActive
  })

  // Load existing areas
  useEffect(() => {
    async function loadAreas() {
      setLoadingAreas(true)
      try {
        const result = await getServiceProviderAreasAction(provider.id)
        if (result.isSuccess && result.data) {
          const areas: SelectedAreaWithId[] = result.data.map((area) => ({
            id: area.id,
            suburb: area.suburb || "",
            city: area.city || "",
            province: area.province
          }))
          setSelectedAreas(areas)
        }
      } catch (error) {
        console.error("Error loading areas:", error)
        toast.error("Failed to load service areas")
      } finally {
        setLoadingAreas(false)
      }
    }
    loadAreas()
  }, [provider.id])

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
        id: area.id,
        suburb: area.suburb!,
        city: area.city,
        province: area.province,
        country: "South Africa" as const
      }))

      const result = await updateServiceProviderAction(
        provider.id,
        {
          businessName: formData.businessName || null,
          contactName: formData.contactName,
          phone: formData.phone || null,
          whatsappNumber: formData.whatsappNumber || null,
          email: formData.email,
          specialization: formData.specialization || null,
          licenseNumber: formData.licenseNumber || null,
          insuranceInfo: formData.insuranceInfo || null,
          isActive: formData.isActive
        },
        areas
      )

      if (result.isSuccess) {
        toast.success("Service provider updated successfully")
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(`/dashboard/service-providers/${provider.id}`)
        }
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error updating service provider:", error)
      toast.error("Failed to update service provider")
    } finally {
      setLoading(false)
    }
  }

  if (loadingAreas) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Service Provider</CardTitle>
        <CardDescription>Update service provider information</CardDescription>
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
              onValueChange={(value: "plumbing" | "electrical" | "hvac" | "general_maintenance" | "painting" | "carpentry" | "roofing" | "other") => setFormData({ ...formData, specialization: value })}
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

          <div>
            <Label htmlFor="isActive">Status</Label>
            <Select
              value={formData.isActive ? "active" : "inactive"}
              onValueChange={(value) =>
                setFormData({ ...formData, isActive: value === "active" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
              Update Provider
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

