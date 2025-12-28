"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"
import type { TemplateField } from "@/lib/utils/template-helpers"

interface FieldBuilderProps {
  fields: TemplateField[]
  onChange: (fields: TemplateField[]) => void
  title?: string
}

const FIELD_TYPES: Array<{ value: TemplateField["type"]; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Textarea" }
]

export function FieldBuilder({ fields, onChange, title = "Fields" }: FieldBuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const addField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: "New Field",
      type: "text",
      required: false
    }
    onChange([...fields, newField])
    setEditingId(newField.id)
  }

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id))
    if (editingId === id) {
      setEditingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No fields. Click "Add Field" to add one.
          </div>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className={`border rounded-lg p-3 space-y-3 ${editingId === field.id ? "border-primary" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        className="h-8 text-sm"
                        onFocus={() => setEditingId(field.id)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value: TemplateField["type"]) => updateField(field.id, { type: value })}
                        onOpenChange={() => setEditingId(field.id)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {field.suffix !== undefined && (
                      <div>
                        <Label className="text-xs">Suffix (optional)</Label>
                        <Input
                          value={field.suffix || ""}
                          onChange={(e) => updateField(field.id, { suffix: e.target.value || undefined })}
                          placeholder="e.g., per month"
                          className="h-8 text-sm"
                          onFocus={() => setEditingId(field.id)}
                        />
                      </div>
                    )}
                    {field.placeholder !== undefined && (
                      <div>
                        <Label className="text-xs">Placeholder (optional)</Label>
                        <Input
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value || undefined })}
                          placeholder="Placeholder text"
                          className="h-8 text-sm"
                          onFocus={() => setEditingId(field.id)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(field.id, { required: !!checked })}
                    />
                    <Label htmlFor={`required-${field.id}`} className="text-xs cursor-pointer">
                      Required field
                    </Label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(field.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

