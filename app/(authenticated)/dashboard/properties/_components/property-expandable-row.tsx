"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, X, Check, ChevronDown, ChevronRight, Users, AlertCircle, Calendar, ExternalLink } from "lucide-react"
import { PropertyWithDetails } from "@/queries/properties-queries"
import { SelectTenant } from "@/db/schema"
import { updatePropertyAction, deletePropertyAction } from "@/actions/properties-actions"
import { updateTenantAction, deleteTenantAction } from "@/actions/tenants-actions"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface PropertyWithLateCount extends PropertyWithDetails {
  lateScheduleCount?: number
}

interface PropertyExpandableRowProps {
  property: PropertyWithLateCount
}

interface TenantRowProps {
  tenant: SelectTenant
  onUpdate: () => void
}

function TenantRow({ tenant, onUpdate }: TenantRowProps) {
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

  const handleUpdate = async () => {
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
        onUpdate()
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
        onUpdate()
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
      <tr className="border-b bg-muted/20">
        <td className="p-3 pl-12">
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-9"
            required
          />
        </td>
        <td className="p-3">
          <Input
            value={formData.idNumber}
            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            className="h-9"
            required
            placeholder="ID/Passport number"
          />
        </td>
        <td className="p-3">
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
        <td className="p-3">
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-3">
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-3">
          <Input
            type="date"
            value={formData.leaseStartDate}
            onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-3">
          <Input
            type="date"
            value={formData.leaseEndDate}
            onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
            className="h-9"
          />
        </td>
        <td className="p-3">
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
    <tr className="border-b hover:bg-muted/30 bg-muted/10">
      <td className="p-3 pl-12 font-medium text-sm">{tenant.name}</td>
      <td className="p-3 text-sm text-muted-foreground">{tenant.idNumber}</td>
      <td className="p-3 text-sm font-medium">
        {tenant.rentalAmount ? `R${tenant.rentalAmount}/month` : "-"}
      </td>
      <td className="p-3 text-sm text-muted-foreground">{tenant.email || "-"}</td>
      <td className="p-3 text-sm text-muted-foreground">{tenant.phone || "-"}</td>
      <td className="p-3 text-sm">{formatDate(tenant.leaseStartDate)}</td>
      <td className="p-3 text-sm">{formatDate(tenant.leaseEndDate)}</td>
      <td className="p-3">
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

export function PropertyExpandableRow({ property }: PropertyExpandableRowProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: property.name,
    streetAddress: property.streetAddress || "",
    suburb: property.suburb || "",
    province: property.province || "",
    country: property.country || "",
    postalCode: property.postalCode || "",
    propertyType: property.propertyType || ""
  })

  const handleUpdate = async () => {
    setLoading(true)
    try {
      const result = await updatePropertyAction(property.id, {
        name: formData.name,
        streetAddress: formData.streetAddress,
        suburb: formData.suburb,
        province: formData.province,
        country: formData.country,
        postalCode: formData.postalCode || undefined,
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
      streetAddress: property.streetAddress || "",
      suburb: property.suburb || "",
      province: property.province || "",
      country: property.country || "",
      postalCode: property.postalCode || "",
      propertyType: property.propertyType || ""
    })
    setIsEditing(false)
  }

  const handleTenantUpdate = () => {
    router.refresh()
  }

  if (isEditing) {
    return (
      <>
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
            <Input
              value={formData.streetAddress}
              onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
              className="h-9"
              placeholder="Street address"
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
      </>
    )
  }

  return (
    <>
      <tr className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <Link
              href={`/dashboard/properties/${property.id}`}
              className="font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {property.name}
            </Link>
            {property.tenants.length > 0 && (
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Users className="h-3 w-3" />
                {property.tenants.length}
              </span>
            )}
            {property.lateScheduleCount !== undefined && property.lateScheduleCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                <AlertCircle className="mr-1 h-3 w-3" />
                {property.lateScheduleCount} late schedule{property.lateScheduleCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </td>
        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
          {property.streetAddress || "-"}
        </td>
        <td className="p-4 text-sm">{property.propertyType || "-"}</td>
        <td className="p-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8"
              title="View Property Details"
            >
              <Link href={`/dashboard/properties/${property.id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8"
              title="Manage Billing Schedules"
            >
              <Link href={`/dashboard/properties/${property.id}/billing-setup`}>
                <Calendar className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
              disabled={loading}
              className="h-8 w-8"
              title="Edit Property"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={loading}
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Delete Property"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={4} className="p-0 bg-muted/20">
            <div className="p-4">
              {property.tenants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tenants assigned to this property
                </div>
              ) : (
                <div className="rounded-md border bg-background">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          Name
                        </th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          ID Number
                        </th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          Rental Amount
                        </th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          Email
                        </th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          Phone
                        </th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          Lease Start
                        </th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs">
                          Lease End
                        </th>
                        <th className="h-10 px-3 text-right align-middle font-medium text-muted-foreground text-xs">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {property.tenants.map((tenant) => (
                        <TenantRow key={tenant.id} tenant={tenant} onUpdate={handleTenantUpdate} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

