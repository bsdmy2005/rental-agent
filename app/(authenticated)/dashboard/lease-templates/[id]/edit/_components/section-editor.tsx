"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "./rich-text-editor"
import { FieldBuilder } from "./field-builder"
import { SubsectionEditor } from "./subsection-editor"
import { contentToString, stringToContent } from "@/lib/utils/template-helpers"
import type { TemplateSection } from "@/lib/utils/template-helpers"
import { SeparatorHorizontal } from "lucide-react"

interface SectionEditorProps {
  section: TemplateSection | null
  onChange: (updates: Partial<TemplateSection>) => void
}

export function SectionEditor({ section, onChange }: SectionEditorProps) {
  if (!section) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <p className="text-muted-foreground">Select a section to edit</p>
        </CardContent>
      </Card>
    )
  }

  const handleContentChange = (html: string) => {
    // Store HTML content directly - TipTap returns HTML
    onChange({ content: html })
  }

  // Get content value for editor - handle both HTML string and array formats
  const getContentValue = (): string => {
    if (!section.content) return ""
    if (typeof section.content === "string") {
      return section.content
    }
    if (Array.isArray(section.content) && section.content.length > 0) {
      // If first item looks like HTML, use it directly
      const first = section.content[0]
      if (typeof first === "string" && (first.includes("<p>") || first.includes("<div>"))) {
        return first
      }
      // Otherwise join with newlines
      return section.content.join("\n\n")
    }
    return ""
  }

  const contentValue = getContentValue()

  return (
    <div className="h-full overflow-y-auto">
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              value={section.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Section title"
            />
            {section.type === "header" && (
              <>
                <Label>Subtitle (optional)</Label>
                <Input
                  value={section.subtitle || ""}
                  onChange={(e) => onChange({ subtitle: e.target.value || undefined })}
                  placeholder="Subtitle"
                />
              </>
            )}
            {section.type !== "header" && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <SeparatorHorizontal className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="page-break" className="text-sm font-normal cursor-pointer">
                    Start on new page
                  </Label>
                </div>
                <Switch
                  id="page-break"
                  checked={section.pageBreakBefore || false}
                  onCheckedChange={(checked) => onChange({ pageBreakBefore: checked })}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content" className="w-full">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              {section.type === "section" && <TabsTrigger value="fields">Fields</TabsTrigger>}
              {section.type === "section" && <TabsTrigger value="subsections">Subsections</TabsTrigger>}
              {section.footer !== undefined && <TabsTrigger value="footer">Footer</TabsTrigger>}
            </TabsList>

            <TabsContent value="content" className="mt-4">
              {section.type === "header" ? (
                <div className="text-sm text-muted-foreground">
                  Header sections display the title and subtitle only. Content editing is not available for headers.
                </div>
              ) : section.type === "signatures" ? (
                <div className="text-sm text-muted-foreground">
                  Signature sections are automatically generated. Content editing is not available for signature sections.
                </div>
              ) : (
                <RichTextEditor
                  content={contentValue}
                  onChange={handleContentChange}
                  placeholder="Enter section content..."
                />
              )}
            </TabsContent>

            {section.type === "section" && (
              <>
                <TabsContent value="fields" className="mt-4">
                  <FieldBuilder
                    fields={section.fields || []}
                    onChange={(fields) => onChange({ fields })}
                    title="Section Fields"
                  />
                </TabsContent>

                <TabsContent value="subsections" className="mt-4">
                  <SubsectionEditor
                    subsections={section.subsections || []}
                    onChange={(subsections) => onChange({ subsections })}
                  />
                </TabsContent>
              </>
            )}

            {section.footer !== undefined && (
              <TabsContent value="footer" className="mt-4">
                <div className="space-y-2">
                  <Label>Footer Text</Label>
                  <Textarea
                    value={section.footer || ""}
                    onChange={(e) => onChange({ footer: e.target.value || undefined })}
                    placeholder="Footer text (optional)"
                    rows={4}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

