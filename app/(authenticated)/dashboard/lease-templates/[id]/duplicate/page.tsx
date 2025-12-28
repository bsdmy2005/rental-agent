"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { getLeaseTemplateByIdAction, createLeaseTemplateAction } from "@/actions/lease-templates-actions"
import { toast } from "sonner"

export default function DuplicateTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    isDefault: false,
    templateData: null as any
  })

  useEffect(() => {
    async function loadTemplate() {
      try {
        const result = await getLeaseTemplateByIdAction(templateId)
        if (result.isSuccess && result.data) {
          setFormData({
            name: `${result.data.name} (Copy)`,
            isDefault: false,
            templateData: result.data.templateData
          })
        } else {
          toast.error(result.message || "Failed to load template")
          router.push("/dashboard/lease-templates")
        }
      } catch (error) {
        toast.error("Failed to load template")
        router.push("/dashboard/lease-templates")
      } finally {
        setLoading(false)
      }
    }

    if (templateId) {
      loadTemplate()
    }
  }, [templateId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const result = await createLeaseTemplateAction({
        name: formData.name,
        templateData: formData.templateData,
        isDefault: formData.isDefault
      })

      if (result.isSuccess) {
        toast.success(result.message)
        router.push("/dashboard/lease-templates")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to duplicate template")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/lease-templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Duplicate Lease Template</CardTitle>
          <CardDescription>
            Create a copy of this template with a new name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label htmlFor="isDefault">Set as default template</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving || !formData.name}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Duplicate"
                )}
              </Button>
              <Link href="/dashboard/lease-templates">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

