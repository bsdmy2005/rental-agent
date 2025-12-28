"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { getLeaseTemplateByIdAction } from "@/actions/lease-templates-actions"
import { toast } from "sonner"
import { TemplateEditor } from "./_components/template-editor"
import type { TemplateSection } from "@/lib/utils/template-helpers"

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<{
    name: string
    isDefault: boolean
    sections: TemplateSection[]
  } | null>(null)

  useEffect(() => {
    async function loadTemplate() {
      try {
        const result = await getLeaseTemplateByIdAction(templateId)
        if (result.isSuccess && result.data) {
          const templateData = result.data.templateData
          // Ensure sections array exists and has order
          const sections = (templateData?.sections || []).map((s: TemplateSection, i: number) => ({
            ...s,
            order: s.order ?? i
          }))
          setTemplate({
            name: result.data.name,
            isDefault: result.data.isDefault,
            sections
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!template) {
    return null
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b bg-background">
        <Link href="/dashboard/lease-templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <TemplateEditor
          templateId={templateId}
          initialName={template.name}
          initialIsDefault={template.isDefault}
          initialSections={template.sections}
          onSave={() => {
            // Optionally refresh or navigate
          }}
        />
      </div>
    </div>
  )
}
