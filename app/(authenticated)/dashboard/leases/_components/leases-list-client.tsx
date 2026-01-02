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
import { FileText, Clock, CheckCircle2, XCircle, Mail, ExternalLink, Trash2 } from "lucide-react"
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
  lifecycleState: "waiting" | "signed" | "moving_in_pending" | "active" | "escalation_due" | "moving_out_pending" | "completed"
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
  property: {
    id: string
    name: string
    streetAddress: string
    suburb: string
    province: string
  } | null
}

interface LeasesListClientProps {
  leases: LeaseWithDetails[]
}

export function LeasesListClient({ leases }: LeasesListClientProps) {
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

  const canDelete = (lease: LeaseWithDetails) => {
    // Allow delete button to show for all leases - the server action will enforce dev mode restriction
    // In dev mode, fully executed leases can be deleted for testing
    return true
  }

  // Filter leases based on selected tab
  const filteredLeases = leases.filter((lease) => {
    if (filter === "pending") {
      // Pending = any status that's not fully executed or draft
      return (
        lease.initiationStatus === "sent_to_landlord" ||
        lease.initiationStatus === "landlord_signed" ||
        lease.initiationStatus === "sent_to_tenant" ||
        lease.initiationStatus === "tenant_signed"
      )
    }
    if (filter === "signed") {
      return lease.initiationStatus === "fully_executed" || (lease.signedByTenant && lease.signedByLandlord)
    }
    if (filter === "draft") {
      return lease.initiationStatus === "draft"
    }
    return true // "all"
  })

  const getStatusBadge = (lease: LeaseWithDetails) => {
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
    if (lease.initiationStatus === "landlord_signed") {
      return (
        <Badge className="bg-purple-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Landlord Signed - Awaiting Tenant
        </Badge>
      )
    }
    if (lease.initiationStatus === "sent_to_landlord") {
      return (
        <Badge className="bg-blue-600">
          <Mail className="mr-1 h-3 w-3" />
          Sent to Landlord
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
    if (lease.initiationMethod === "upload_existing") {
      return (
        <Badge variant="secondary">
          <FileText className="mr-1 h-3 w-3" />
          Uploaded
        </Badge>
      )
    }
    return (
      <Badge variant="outline">
        <Clock className="mr-1 h-3 w-3" />
        Waiting
      </Badge>
    )
  }

  const getSigningStatus = (lease: LeaseWithDetails) => {
    if (lease.signedByTenant && lease.signedByLandlord) {
      return "Both parties signed"
    }
    if (lease.signedByTenant) {
      return "Tenant signed"
    }
    if (lease.signedByLandlord) {
      return "Landlord signed - Waiting for tenant"
    }
    if (lease.initiationStatus === "sent_to_tenant") {
      return "Awaiting tenant signature"
    }
    if (lease.initiationStatus === "landlord_signed") {
      return "Landlord signed - Awaiting tenant"
    }
    if (lease.initiationStatus === "sent_to_landlord") {
      return "Awaiting landlord signature"
    }
    return "Not signed"
  }

  if (leases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No lease agreements found.</p>
        <p className="text-muted-foreground text-sm">Initiate a new lease from a property page to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">All Leases ({leases.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Signing ({leases.filter((l) => l.initiationStatus === "sent_to_tenant" || l.initiationStatus === "tenant_signed").length})
          </TabsTrigger>
          <TabsTrigger value="signed">
            Signed ({leases.filter((l) => l.initiationStatus === "fully_executed" || (l.signedByTenant && l.signedByLandlord)).length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Drafts ({leases.filter((l) => l.initiationStatus === "draft").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredLeases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No leases found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeases.map((lease) => (
                <Card key={lease.id} className="hover:bg-accent transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {lease.property?.name || "Unknown Property"}
                          {getStatusBadge(lease)}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span>
                              <strong>Tenant:</strong> {lease.tenant?.name || "Unknown"}
                            </span>
                            {lease.property && (
                              <span>
                                <strong>Property:</strong> {lease.property.streetAddress}, {lease.property.suburb}
                              </span>
                            )}
                            <span>
                              <strong>Lease Period:</strong> {format(new Date(lease.effectiveStartDate), "MMM d, yyyy")} - {format(new Date(lease.effectiveEndDate), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {getSigningStatus(lease)}
                            {lease.tenantSigningExpiresAt && lease.initiationStatus === "sent_to_tenant" && (
                              <span className="ml-2">
                                • Expires: {format(new Date(lease.tenantSigningExpiresAt), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      {lease.initiationStatus === "sent_to_tenant" && lease.tenantSigningLink && (
                        <Link href={lease.tenantSigningLink} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Signing Link
                          </Button>
                        </Link>
                      )}
                      <Link href={`/dashboard/properties/${lease.propertyId}`}>
                        <Button variant="ghost" size="sm">
                          View Property
                        </Button>
                      </Link>
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
                                {lease.signedByTenant && lease.signedByLandlord ? (
                                  <span className="block mt-2 text-yellow-600">
                                    Note: This lease is fully executed. Deletion is only allowed in development mode for testing purposes.
                                  </span>
                                ) : lease.signedByTenant || lease.signedByLandlord ? (
                                  <span className="block mt-2 text-yellow-600">
                                    Note: This lease has been partially signed.
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

