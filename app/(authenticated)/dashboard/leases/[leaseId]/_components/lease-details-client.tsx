"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import {
  FileText,
  Clock,
  CheckCircle2,
  Mail,
  ExternalLink,
  Trash2,
  User,
  Building2,
  Calendar,
  FileCheck
} from "lucide-react"
import { deleteLeaseAction } from "@/actions/lease-initiation-actions"
import { toast } from "sonner"

interface LeaseWithDetails {
  id: string
  tenantId: string
  propertyId: string
  fileName: string
  fileUrl: string
  effectiveStartDate: Date
  effectiveEndDate: Date
  initiationMethod: "upload_existing" | "initiate_new"
  initiationStatus: "draft" | "sent_to_tenant" | "tenant_signed" | "landlord_signed" | "fully_executed" | null
  lifecycleState: string
  signedByTenant: boolean
  signedByLandlord: boolean
  signedAt: Date | null
  tenantSigningLink: string | null
  tenantSigningToken: string | null
  tenantSigningExpiresAt: Date | null
  createdAt: Date
  tenant: {
    id: string
    name: string
    email: string | null
  } | null
  property: {
    id: string
    name: string
    streetAddress: string
    suburb: string
    province: string
  } | null
}

interface LeaseDetailsClientProps {
  lease: LeaseWithDetails
}

export function LeaseDetailsClient({ lease }: LeaseDetailsClientProps) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const result = await deleteLeaseAction(lease.id)
      if (result.isSuccess) {
        toast.success(result.message)
        router.push("/dashboard/leases")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete lease")
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = !(lease.signedByTenant && lease.signedByLandlord)

  const getStatusBadge = () => {
    if (lease.initiationStatus === "fully_executed" || (lease.signedByTenant && lease.signedByLandlord)) {
      return (
        <Badge className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Fully Executed
        </Badge>
      )
    }
    if (lease.initiationStatus === "tenant_signed") {
      return (
        <Badge className="bg-yellow-600">
          <Clock className="mr-1 h-3 w-3" />
          Tenant Signed
        </Badge>
      )
    }
    if (lease.initiationStatus === "sent_to_tenant") {
      return (
        <Badge className="bg-blue-600">
          <Mail className="mr-1 h-3 w-3" />
          Sent to Tenant
        </Badge>
      )
    }
    if (lease.initiationStatus === "draft") {
      return (
        <Badge variant="outline">
          <FileText className="mr-1 h-3 w-3" />
          Draft
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <FileText className="mr-1 h-3 w-3" />
        Uploaded
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease Agreement Details</h1>
          <p className="text-muted-foreground mt-1">{lease.fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lease Agreement?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this lease agreement? This action cannot be undone.
                    {lease.signedByTenant || lease.signedByLandlord ? (
                      <span className="block mt-2 text-yellow-600">
                        Note: This lease has been partially signed. Only unsigned leases should be deleted.
                      </span>
                    ) : null}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {lease.fileUrl && (
              <Link href={lease.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View PDF
                </Button>
              </Link>
            )}
            {lease.initiationStatus === "tenant_signed" && !lease.signedByLandlord && (
              <Link href={`/dashboard/leases/${lease.id}/sign`}>
                <Button>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sign as Landlord
                </Button>
              </Link>
            )}
            {lease.initiationStatus === "sent_to_tenant" && lease.tenantSigningLink && (
              <Link href={lease.tenantSigningLink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Signing Link
                </Button>
              </Link>
            )}
            <Link href={`/dashboard/properties/${lease.propertyId}`}>
              <Button variant="outline">
                <Building2 className="mr-2 h-4 w-4" />
                View Property
              </Button>
            </Link>
            {lease.tenant && (
              <Link href={`/dashboard/tenants/${lease.tenant.id}`}>
                <Button variant="outline">
                  <User className="mr-2 h-4 w-4" />
                  View Tenant
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tenant Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tenant Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-sm">{lease.tenant?.name || "Unknown"}</p>
            </div>
            {lease.tenant?.email && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{lease.tenant.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Property Name</p>
              <p className="text-sm">{lease.property?.name || "Unknown"}</p>
            </div>
            {lease.property && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm">
                  {lease.property.streetAddress}, {lease.property.suburb}, {lease.property.province}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lease Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Lease Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-sm">{format(new Date(lease.effectiveStartDate), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">End Date</p>
              <p className="text-sm">{format(new Date(lease.effectiveEndDate), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="text-sm">
                {Math.ceil(
                  (new Date(lease.effectiveEndDate).getTime() - new Date(lease.effectiveStartDate).getTime()) /
                    (1000 * 60 * 60 * 24 * 30)
                )}{" "}
                months
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Signing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Signing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tenant Signature</p>
              <p className="text-sm">
                {lease.signedByTenant ? (
                  <Badge className="bg-green-600">Signed</Badge>
                ) : (
                  <Badge variant="outline">Not Signed</Badge>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Landlord Signature</p>
              <p className="text-sm">
                {lease.signedByLandlord ? (
                  <Badge className="bg-green-600">Signed</Badge>
                ) : (
                  <Badge variant="outline">Not Signed</Badge>
                )}
              </p>
            </div>
            {lease.signedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fully Executed</p>
                <p className="text-sm">{format(new Date(lease.signedAt), "MMMM d, yyyy 'at' h:mm a")}</p>
              </div>
            )}
            {lease.tenantSigningExpiresAt && lease.initiationStatus === "sent_to_tenant" && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Signing Link Expires</p>
                <p className="text-sm text-yellow-600">
                  {format(new Date(lease.tenantSigningExpiresAt), "MMMM d, yyyy")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Initiation Method</p>
            <p className="text-sm">
              {lease.initiationMethod === "initiate_new" ? "Initiated New Lease" : "Uploaded Existing Lease"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Lifecycle State</p>
            <p className="text-sm capitalize">{lease.lifecycleState.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Created</p>
            <p className="text-sm">{format(new Date(lease.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

