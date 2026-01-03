"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Trash2, X, Check } from "lucide-react"
import { SelectProperty } from "@/db/schema"
import { updatePropertyAction, deletePropertyAction } from "@/actions/properties-actions"
import { toast } from "sonner"

interface PropertyItemProps {
  property: SelectProperty
}

export function PropertyItem({ property }: PropertyItemProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: property.name,
    address: property.address || "",
    propertyType: property.propertyType || ""
  })

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updatePropertyAction(property.id, {
        name: formData.name,
        address: formData.address || undefined,
        propertyType: formData.propertyType || undefined
      })

      if (result.isSuccess) {
        toast.success("Property updated successfully!")
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update property")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this property?")) {
      return
    }

    setLoading(true)
    try {
      const result = await deletePropertyAction(property.id)
      if (result.isSuccess) {
        toast.success("Property deleted successfully!")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete property")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: property.name,
      address: property.address || "",
      propertyType: property.propertyType || ""
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${property.id}`}>Property Name</Label>
              <Input
                id={`name-${property.id}`}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`address-${property.id}`}>Address</Label>
              <Textarea
                id={`address-${property.id}`}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="min-h-[80px] resize-none"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`type-${property.id}`}>Property Type</Label>
              <Input
                id={`type-${property.id}`}
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
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
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="text-lg font-semibold">{property.name}</h3>
              {property.propertyType && (
                <p className="text-muted-foreground text-sm">{property.propertyType}</p>
              )}
            </div>
            {property.address && (
              <p className="text-muted-foreground text-sm">{property.address}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

