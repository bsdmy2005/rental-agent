"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Check, X, Building2 } from "lucide-react"
import { SelectProperty } from "@/db/schema"
import { updatePropertyAction } from "@/actions/properties-actions"
import { toast } from "sonner"

interface PropertyBankingDetailsSectionProps {
  property: SelectProperty
}

export function PropertyBankingDetailsSection({ property }: PropertyBankingDetailsSectionProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    bankName: property.bankName || "",
    accountHolderName: property.accountHolderName || "",
    accountNumber: property.accountNumber || "",
    branchCode: property.branchCode || "",
    swiftCode: property.swiftCode || "",
    referenceFormat: property.referenceFormat || ""
  })

  const hasBankingDetails =
    property.bankName ||
    property.accountHolderName ||
    property.accountNumber ||
    property.branchCode ||
    property.swiftCode ||
    property.referenceFormat

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updatePropertyAction(property.id, {
        bankName: formData.bankName || undefined,
        accountHolderName: formData.accountHolderName || undefined,
        accountNumber: formData.accountNumber || undefined,
        branchCode: formData.branchCode || undefined,
        swiftCode: formData.swiftCode || undefined,
        referenceFormat: formData.referenceFormat || undefined
      })

      if (result.isSuccess) {
        toast.success("Banking details updated successfully!")
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to update banking details")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      bankName: property.bankName || "",
      accountHolderName: property.accountHolderName || "",
      accountNumber: property.accountNumber || "",
      branchCode: property.branchCode || "",
      swiftCode: property.swiftCode || "",
      referenceFormat: property.referenceFormat || ""
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions (Banking Details)</CardTitle>
          <CardDescription>
            Banking details that will appear on rental invoices for this property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g., Standard Bank"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  placeholder="Name on account"
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Account number"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchCode">Branch Code</Label>
                <Input
                  id="branchCode"
                  value={formData.branchCode}
                  onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                  placeholder="e.g., 000123"
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="swiftCode">Swift Code</Label>
                <Input
                  id="swiftCode"
                  value={formData.swiftCode}
                  onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                  placeholder="e.g., SBZAZAJJ"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceFormat">Reference Format</Label>
                <Input
                  id="referenceFormat"
                  value={formData.referenceFormat}
                  onChange={(e) => setFormData({ ...formData, referenceFormat: e.target.value })}
                  placeholder="e.g., Use invoice number as reference"
                  className="h-10"
                />
              </div>
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Instructions (Banking Details)</CardTitle>
            <CardDescription>
              Banking details that will appear on rental invoices for this property
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={loading}
          >
            <Pencil className="mr-2 h-4 w-4" />
            {hasBankingDetails ? "Edit" : "Add"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hasBankingDetails ? (
          <div className="space-y-3">
            {property.bankName && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Bank Name:</span>
                <p className="text-sm">{property.bankName}</p>
              </div>
            )}
            {property.accountHolderName && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Account Holder:</span>
                <p className="text-sm">{property.accountHolderName}</p>
              </div>
            )}
            {property.accountNumber && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Account Number:</span>
                <p className="text-sm">{property.accountNumber}</p>
              </div>
            )}
            {property.branchCode && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Branch Code:</span>
                <p className="text-sm">{property.branchCode}</p>
              </div>
            )}
            {property.swiftCode && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Swift Code:</span>
                <p className="text-sm">{property.swiftCode}</p>
              </div>
            )}
            {property.referenceFormat && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Reference Format:</span>
                <p className="text-sm">{property.referenceFormat}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">No banking details configured</p>
            <p className="text-xs text-muted-foreground">
              Add banking details to display payment instructions on rental invoices
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

