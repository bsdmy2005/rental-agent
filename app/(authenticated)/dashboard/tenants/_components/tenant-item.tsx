"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Trash2, X, Check } from "lucide-react"
import { SelectTenant } from "@/db/schema"
import { updateTenantAction, deleteTenantAction } from "@/actions/tenants-actions"
import { toast } from "sonner"

interface TenantItemProps {
  tenant: SelectTenant
}

export function TenantItem({ tenant }: TenantItemProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: tenant.name,
    email: tenant.email || "",
    phone: tenant.phone || ""
  })

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateTenantAction(tenant.id, {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined
      })

      if (result.isSuccess) {
        toast.success("Tenant updated successfully!")
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update tenant")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tenant?")) {
      return
    }

    setLoading(true)
    try {
      const result = await deleteTenantAction(tenant.id)
      if (result.isSuccess) {
        toast.success("Tenant deleted successfully!")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete tenant")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: tenant.name,
      email: tenant.email || "",
      phone: tenant.phone || ""
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${tenant.id}`}>Name</Label>
              <Input
                id={`name-${tenant.id}`}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`email-${tenant.id}`}>Email</Label>
              <Input
                id={`email-${tenant.id}`}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`phone-${tenant.id}`}>Phone</Label>
              <Input
                id={`phone-${tenant.id}`}
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-semibold">{tenant.name}</h3>
            {tenant.email && (
              <p className="text-muted-foreground text-sm">{tenant.email}</p>
            )}
            {tenant.phone && (
              <p className="text-muted-foreground text-sm">{tenant.phone}</p>
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

