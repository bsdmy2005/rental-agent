"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { FileText, Clock, CheckCircle2, Mail, ExternalLink, ArrowRight, Trash2 } from "lucide-react"
import { deleteLeaseAction } from "@/actions/lease-initiation-actions"
import { toast } from "sonner"

interface LeaseWithTenant {
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
  tenantSigningExpiresAt: Date | null
  createdAt: Date
  tenant: {
    id: string
    name: string
    email: string | null
  } | null
}

interface PropertyLeasesSectionClientProps {
  leases: LeaseWithTenant[]
  propertyId: string
  pendingCount: number
  signedCount: number
  draftCount: number
}

export function PropertyLeasesSectionClient({
  leases,
  propertyId,
  pendingCount,
  signedCount,
  draftCount
}: PropertyLeasesSectionClientProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "signed" | "draft">("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async (leaseId: string) => {
    setDeletingId(leaseId)
    try {
      const result = await deleteLeaseAction(leaseId)
      if (result.isSuccess) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete lease")
    } finally {
      setDeletingId(null)
    }
  }

  const canDelete = (lease: LeaseWithTenant) => {
    // Can only delete if not fully signed by both parties
    return !(lease.signedByTenant && lease.signedByLandlord)
  }

  const filteredLeases = leases.filter((lease) => {
    if (filter === "pending") {
      return (
        lease.initiationStatus === "sent_to_tenant" ||
        lease.initiationStatus === "tenant_signed" ||
        (lease.initiationStatus === "landlord_signed" && !lease.signedByTenant)
      )
    }
    if (filter === "signed") {
      return lease.initiationStatus === "fully_executed" || (lease.signedByTenant && lease.signedByLandlord)
    }
    if (filter === "draft") {
      return lease.initiationStatus === "draft"
    }
    return true
  })

  const getStatusBadge = (lease: LeaseWithTenant) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lease Agreements</h3>
          <p className="text-sm text-muted-foreground">
            {leases.length} lease{leases.length !== 1 ? "s" : ""} for this property
          </p>
        </div>
        <Link href={`/dashboard/properties/${propertyId}/leases/new`}>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Initiate New Lease
          </Button>
        </Link>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All ({leases.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="signed">Signed ({signedCount})</TabsTrigger>
          {draftCount > 0 && <TabsTrigger value="draft">Drafts ({draftCount})</TabsTrigger>}
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {filteredLeases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No leases found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeases.map((lease) => (
                <Card key={lease.id} className="hover:bg-accent transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {lease.tenant?.name || "Unknown Tenant"}
                          {getStatusBadge(lease)}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          <div className="flex flex-wrap gap-3">
                            <span>
                              <strong>Period:</strong> {format(new Date(lease.effectiveStartDate), "MMM d, yyyy")} - {format(new Date(lease.effectiveEndDate), "MMM d, yyyy")}
                            </span>
                            {lease.tenant?.email && (
                              <span>
                                <strong>Email:</strong> {lease.tenant.email}
                              </span>
                            )}
                            {lease.initiationStatus === "sent_to_tenant" && lease.tenantSigningExpiresAt && (
                              <span className="text-yellow-600">
                                <strong>Expires:</strong> {format(new Date(lease.tenantSigningExpiresAt), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                      {lease.fileUrl && (
                        <Link href={lease.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <FileText className="mr-2 h-4 w-4" />
                            View PDF
                          </Button>
                        </Link>
                      )}
                      {lease.initiationStatus === "tenant_signed" && !lease.signedByLandlord && (
                        <Link href={`/dashboard/leases/${lease.id}/sign`}>
                          <Button size="sm">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Sign as Landlord
                          </Button>
                        </Link>
                      )}
                      <Link href={`/dashboard/leases/${lease.id}`}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {canDelete(lease) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === lease.id}
                            >
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
                                onClick={() => handleDelete(lease.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

