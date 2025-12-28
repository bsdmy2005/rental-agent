"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { createLeaseTemplateAction } from "@/actions/lease-templates-actions"
import { toast } from "sonner"
import { defaultLeaseTemplateData } from "@/lib/lease-templates/default-template"

export default function NewTemplatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    isDefault: false,
    templateData: defaultLeaseTemplateData
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

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
      toast.error("Failed to create template")
    } finally {
      setLoading(false)
    }
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
          <CardTitle>Create Lease Template</CardTitle>
          <CardDescription>
            Create a new lease agreement template. You can customize the template structure later.
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
                placeholder="e.g., Standard Residential Lease"
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
              <Button type="submit" disabled={loading || !formData.name}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Template Preview</CardTitle>
          <CardDescription>
            This template will be created with the standard South African Residential Lease structure.
            You can edit it after creation to customize sections and fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>The template includes the following sections:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Parties (Landlord & Tenant)</li>
              <li>Leased Premises</li>
              <li>Purpose of Lease</li>
              <li>Duration</li>
              <li>Rental</li>
              <li>Deposit</li>
              <li>Utilities and Charges</li>
              <li>Occupation & Condition</li>
              <li>Maintenance & Repairs</li>
              <li>Use, Care & Conduct</li>
              <li>Sub-letting & Cession</li>
              <li>Access to Premises</li>
              <li>Breach</li>
              <li>Early Termination (CPA)</li>
              <li>Holdover & Eviction</li>
              <li>Insurance & Risk</li>
              <li>Notices</li>
              <li>Domicilium</li>
              <li>General</li>
              <li>Signatures</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

