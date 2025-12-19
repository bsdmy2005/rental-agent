"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, X, Check } from "lucide-react"
import { TenantWithProperty } from "@/queries/tenants-queries"
import { updateTenantAction, deleteTenantAction } from "@/actions/tenants-actions"
import { toast } from "sonner"

interface TenantTableRowProps {
  tenant: TenantWithProperty
}

export function TenantTableRow({ tenant }: TenantTableRowProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: tenant.name,
    idNumber: tenant.idNumber,
    email: tenant.email || "",
    phone: tenant.phone || "",
    rentalAmount: tenant.rentalAmount?.toString() || "",
    leaseStartDate: tenant.leaseStartDate
      ? new Date(tenant.leaseStartDate).toISOString().split("T")[0]
      : "",
    leaseEndDate: tenant.leaseEndDate
      ? new Date(tenant.leaseEndDate).toISOString().split("T")[0]
      : ""
  })

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    setLoading(true)

    try {
      const result = await updateTenantAction(tenant.id, {
        name: formData.name,
        idNumber: formData.idNumber,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        rentalAmount: formData.rentalAmount ? formData.rentalAmount : undefined,
        leaseStartDate: formData.leaseStartDate ? new Date(formData.leaseStartDate) : undefined,
        leaseEndDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : undefined
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
      idNumber: tenant.idNumber,
      email: tenant.email || "",
      phone: tenant.phone || "",
      rentalAmount: tenant.rentalAmount?.toString() || "",
      leaseStartDate: tenant.leaseStartDate
        ? new Date(tenant.leaseStartDate).toISOString().split("T")[0]
        : "",
      leaseEndDate: tenant.leaseEndDate
        ? new Date(tenant.leaseEndDate).toISOString().split("T")[0]
        : ""
    })
    setIsEditing(false)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
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
          <span className="text-sm">{tenant.property.name}</span>
        </td>
        <td className="p-4">
          <Input
            value={formData.idNumber}
            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            className="h-9"
            required
            placeholder="ID/Passport number"
          />
        </td>
        <td className="p-4">
          <div className="relative">
            <span className="text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 text-xs">
              ZAR
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.rentalAmount}
              onChange={(e) => setFormData({ ...formData, rentalAmount: e.target.value })}
              className="h-9 pl-8"
              placeholder="0.00"
            />
          </div>
        </td>
        <td className="p-4">
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-4">
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-4">
          <Input
            type="date"
            value={formData.leaseStartDate}
            onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-4">
          <Input
            type="date"
            value={formData.leaseEndDate}
            onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
            className="h-9"
          />
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
              onClick={() => handleUpdate()}
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
      <td className="p-4 font-medium">{tenant.name}</td>
      <td className="p-4 text-sm text-muted-foreground">{tenant.property.name}</td>
      <td className="p-4 text-sm">{tenant.idNumber}</td>
      <td className="p-4 text-sm font-medium">
        {tenant.rentalAmount ? `R${tenant.rentalAmount}/month` : "-"}
      </td>
      <td className="p-4 text-sm">{tenant.email || "-"}</td>
      <td className="p-4 text-sm">{tenant.phone || "-"}</td>
      <td className="p-4 text-sm">{formatDate(tenant.leaseStartDate)}</td>
      <td className="p-4 text-sm">{formatDate(tenant.leaseEndDate)}</td>
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

