"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"
import { FieldBuilder } from "./field-builder"
import type { TemplateSubsection } from "@/lib/utils/template-helpers"

interface SubsectionEditorProps {
  subsections: TemplateSubsection[]
  onChange: (subsections: TemplateSubsection[]) => void
}

export function SubsectionEditor({ subsections, onChange }: SubsectionEditorProps) {
  const addSubsection = () => {
    const newSubsection: TemplateSubsection = {
      id: `subsection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: "New Subsection",
      fields: []
    }
    onChange([...subsections, newSubsection])
  }

  const updateSubsection = (id: string, updates: Partial<TemplateSubsection>) => {
    onChange(subsections.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const removeSubsection = (id: string) => {
    onChange(subsections.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Subsections</Label>
        <Button type="button" variant="outline" size="sm" onClick={addSubsection}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subsection
        </Button>
      </div>

      {subsections.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
          No subsections. Click "Add Subsection" to add one.
        </div>
      ) : (
        subsections.map((subsection) => (
          <Card key={subsection.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Subsection Title</Label>
                  <Input
                    value={subsection.title}
                    onChange={(e) => updateSubsection(subsection.id, { title: e.target.value })}
                    placeholder="Subsection title"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSubsection(subsection.id)}
                  className="text-destructive hover:text-destructive mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FieldBuilder
                fields={subsection.fields}
                onChange={(fields) => updateSubsection(subsection.id, { fields })}
                title="Fields"
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

