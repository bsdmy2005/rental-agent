"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, X, Check } from "lucide-react"
import { SelectProperty } from "@/db/schema"
import { updatePropertyAction, deletePropertyAction } from "@/actions/properties-actions"
import { toast } from "sonner"

interface PropertyTableRowProps {
  property: SelectProperty
}

export function PropertyTableRow({ property }: PropertyTableRowProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: property.name,
    address: property.address || "",
    propertyType: property.propertyType || "",
    rentalAmount: property.rentalAmount?.toString() || ""
  })

  const handleUpdate = async () => {
    setLoading(true)

    try {
      const result = await updatePropertyAction(property.id, {
        name: formData.name,
        address: formData.address || undefined,
        propertyType: formData.propertyType || undefined,
        rentalAmount: formData.rentalAmount ? formData.rentalAmount : undefined
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
      propertyType: property.propertyType || "",
      rentalAmount: property.rentalAmount?.toString() || ""
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <tr className="border-b bg-muted/30">
        <td className="p-4">
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-9"
            required
          />
        </td>
        <td className="p-4">
          <Textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="min-h-[60px] resize-none"
            rows={2}
          />
        </td>
        <td className="p-4">
          <Input
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
            className="h-9"
            placeholder="e.g., Apartment, House"
          />
        </td>
        <td className="p-4">
          <div className="relative">
            <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-xs">
              ZAR
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.rentalAmount}
              onChange={(e) => setFormData({ ...formData, rentalAmount: e.target.value })}
              className="h-9 pl-10"
            />
          </div>
        </td>
        <td className="p-4">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={loading}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleUpdate}
              disabled={loading}
              className="h-8 w-8"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-4 font-medium">
        <Link
          href={`/dashboard/properties/${property.id}`}
          className="text-primary hover:underline"
        >
          {property.name}
        </Link>
      </td>
      <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
        {property.address || "-"}
      </td>
      <td className="p-4 text-sm">{property.propertyType || "-"}</td>
      <td className="p-4 text-sm font-medium">
        {property.rentalAmount ? `R${property.rentalAmount}/month` : "-"}
      </td>
      <td className="p-4">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            disabled={loading}
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

