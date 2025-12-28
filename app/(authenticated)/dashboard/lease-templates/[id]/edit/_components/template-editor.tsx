"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebouncedCallback } from "use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { SectionTree } from "./section-tree"
import { SectionEditor } from "./section-editor"
import { PdfPreview } from "./pdf-preview"
import { SectionTypeSelector } from "./section-type-selector"
import {
  addSection,
  removeSection,
  duplicateSection,
  reorderSections,
  updateSection,
  validateTemplate,
  type TemplateSection,
  type TemplateData
} from "@/lib/utils/template-helpers"
import { updateLeaseTemplateAction } from "@/actions/lease-templates-actions"
import { toast } from "sonner"

interface TemplateEditorProps {
  templateId: string
  initialName: string
  initialIsDefault: boolean
  initialSections: TemplateSection[]
  onSave?: () => void
}

export function TemplateEditor({
  templateId,
  initialName,
  initialIsDefault,
  initialSections,
  onSave
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName)
  const [isDefault, setIsDefault] = useState(initialIsDefault)
  const [sections, setSections] = useState<TemplateSection[]>(initialSections)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    sections.length > 0 ? sections[0].id : null
  )
  const [showSectionTypeSelector, setShowSectionTypeSelector] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null

  // Auto-save with debounce
  const debouncedSave = useDebouncedCallback(async (templateData: TemplateData) => {
    setSaveStatus("saving")
    try {
      const result = await updateLeaseTemplateAction(templateId, {
        name,
        templateData,
        isDefault
      })

      if (result.isSuccess) {
        setSaveStatus("saved")
        setHasUnsavedChanges(false)
        setTimeout(() => setSaveStatus("idle"), 2000)
      } else {
        setSaveStatus("error")
        toast.error(result.message)
      }
    } catch (error) {
      setSaveStatus("error")
      toast.error("Failed to save template")
    }
  }, 2000)

  // Manual save
  const handleSave = async () => {
    const templateData: TemplateData = {
      name,
      sections
    }

    const validation = validateTemplate(templateData)
    if (!validation.valid) {
      toast.error(`Template validation failed: ${validation.errors.join(", ")}`)
      return
    }

    setSaveStatus("saving")
    try {
      const result = await updateLeaseTemplateAction(templateId, {
        name,
        templateData,
        isDefault
      })

      if (result.isSuccess) {
        setSaveStatus("saved")
        setHasUnsavedChanges(false)
        toast.success("Template saved successfully")
        onSave?.()
        setTimeout(() => setSaveStatus("idle"), 2000)
      } else {
        setSaveStatus("error")
        toast.error(result.message)
      }
    } catch (error) {
      setSaveStatus("error")
      toast.error("Failed to save template")
    }
  }

  // Auto-save on changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const templateData: TemplateData = {
        name,
        sections
      }
      debouncedSave(templateData)
    }
  }, [name, sections, isDefault, hasUnsavedChanges, debouncedSave])

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSectionId(sectionId)
  }

  const handleSectionReorder = (sourceIndex: number, destinationIndex: number) => {
    setSections(reorderSections(sections, sourceIndex, destinationIndex))
    setHasUnsavedChanges(true)
  }

  const handleAddSection = (type: "header" | "section" | "signatures") => {
    const newSections = addSection(sections, type)
    setSections(newSections)
    setHasUnsavedChanges(true)
    // Select the new section
    const newSection = newSections[newSections.length - 1]
    setSelectedSectionId(newSection.id)
  }

  const handleDuplicateSection = (sectionId: string) => {
    const newSections = duplicateSection(sections, sectionId)
    setSections(newSections)
    setHasUnsavedChanges(true)
  }

  const handleRemoveSection = (sectionId: string) => {
    const newSections = removeSection(sections, sectionId)
    setSections(newSections)
    setHasUnsavedChanges(true)
    // Select first section if current was removed
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(newSections.length > 0 ? newSections[0].id : null)
    }
  }

  const handleSectionUpdate = (updates: Partial<TemplateSection>) => {
    if (!selectedSectionId) return
    setSections(updateSection(sections, selectedSectionId, updates))
    setHasUnsavedChanges(true)
  }

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case "saving":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case "saved":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4 flex-1">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Template Name</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setHasUnsavedChanges(true)
              }}
              className="w-[300px]"
              placeholder="Template name"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isDefault"
              checked={isDefault}
              onCheckedChange={(checked) => {
                setIsDefault(checked)
                setHasUnsavedChanges(true)
              }}
            />
            <Label htmlFor="isDefault" className="text-sm">Set as default</Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getSaveStatusIcon()}
          {saveStatus === "saving" && <span className="text-sm text-muted-foreground">Saving...</span>}
          {saveStatus === "saved" && <span className="text-sm text-muted-foreground">Saved</span>}
          {saveStatus === "error" && <span className="text-sm text-red-600">Error</span>}
          <Button onClick={handleSave} disabled={saveStatus === "saving"}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Panel - Section Tree */}
        <div className="col-span-3 border rounded-lg overflow-hidden bg-background">
          <SectionTree
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelect={handleSectionSelect}
            onReorder={handleSectionReorder}
            onAdd={() => setShowSectionTypeSelector(true)}
            onDuplicate={handleDuplicateSection}
            onRemove={handleRemoveSection}
          />
        </div>

        {/* Center Panel - Section Editor */}
        <div className="col-span-5 border rounded-lg overflow-hidden bg-background">
          <SectionEditor section={selectedSection} onChange={handleSectionUpdate} />
        </div>

        {/* Right Panel - PDF Preview */}
        <div className="col-span-4 border rounded-lg overflow-hidden bg-background">
          <PdfPreview sections={sections} templateName={name} templateId={templateId} />
        </div>
      </div>

      {/* Section Type Selector Dialog */}
      <SectionTypeSelector
        open={showSectionTypeSelector}
        onClose={() => setShowSectionTypeSelector(false)}
        onSelect={handleAddSection}
      />
    </div>
  )
}

