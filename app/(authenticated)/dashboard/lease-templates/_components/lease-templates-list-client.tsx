"use client"

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
import { FileText, Edit, Trash2, Star, Copy } from "lucide-react"
import { deleteLeaseTemplateAction } from "@/actions/lease-templates-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface LeaseTemplate {
  id: string
  name: string
  templateData: any
  isDefault: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

interface LeaseTemplatesListClientProps {
  templates: LeaseTemplate[]
}

export function LeaseTemplatesListClient({ templates }: LeaseTemplatesListClientProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (templateId: string) => {
    setDeletingId(templateId)
    try {
      const result = await deleteLeaseTemplateAction(templateId)
      if (result.isSuccess) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete template")
    } finally {
      setDeletingId(null)
    }
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No lease templates found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first template to get started
          </p>
          <Link href="/dashboard/lease-templates/new">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="hover:bg-accent transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {template.name}
                  {template.isDefault && (
                    <Badge className="bg-yellow-600">
                      <Star className="mr-1 h-3 w-3" />
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2">
                  <div className="text-xs">
                    Created: {format(new Date(template.createdAt), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs">
                    Updated: {format(new Date(template.updatedAt), "MMM d, yyyy")}
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/lease-templates/${template.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Link href={`/dashboard/lease-templates/${template.id}/duplicate`}>
                <Button variant="outline" size="sm">
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === template.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{template.name}"? This action cannot be undone.
                      {template.isDefault && (
                        <span className="block mt-2 text-yellow-600">
                          Note: This is the default template. You may want to set another template as default first.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(template.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

