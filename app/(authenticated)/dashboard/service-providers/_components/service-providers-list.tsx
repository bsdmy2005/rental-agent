"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SelectServiceProvider } from "@/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { deleteServiceProviderAction } from "@/actions/service-providers-actions"
import Link from "next/link"
import { Phone, Mail, Eye, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ServiceProvidersListProps {
  providers: SelectServiceProvider[]
}

export function ServiceProvidersList({ providers }: ServiceProvidersListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<{
    id: string
    name: string
  } | null>(null)

  async function handleDelete() {
    if (!providerToDelete) return

    setDeletingId(providerToDelete.id)
    try {
      const result = await deleteServiceProviderAction(providerToDelete.id)
      if (result.isSuccess) {
        toast.success("Service provider deleted successfully")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error deleting service provider:", error)
      toast.error("Failed to delete service provider")
    } finally {
      setDeletingId(null)
      setDeleteDialogOpen(false)
      setProviderToDelete(null)
    }
  }

  function openDeleteDialog(provider: SelectServiceProvider) {
    setProviderToDelete({
      id: provider.id,
      name: provider.businessName || provider.contactName
    })
    setDeleteDialogOpen(true)
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No service providers found. Add your first provider to get started.
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {provider.businessName || provider.contactName}
                  </CardTitle>
                  <CardDescription>{provider.contactName}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={provider.isActive ? "default" : "secondary"}>
                    {provider.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/service-providers/${provider.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/service-providers/${provider.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(provider)}
                        className="text-destructive"
                        disabled={deletingId === provider.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingId === provider.id ? "Deleting..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {provider.specialization && (
                <div>
                  <Badge variant="outline">{provider.specialization}</Badge>
                </div>
              )}
              {provider.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {provider.phone}
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {provider.email}
                </div>
              )}
              <div className="pt-2">
                <Link href={`/dashboard/service-providers/${provider.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{providerToDelete?.name}</strong>? This action
              cannot be undone. The service provider will be removed from your directory.
              <br />
              <br />
              <strong>Note:</strong> This action cannot be performed if the service provider has
              active quote requests. Please resolve or cancel active quotes first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

