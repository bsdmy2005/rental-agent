"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { contentToString } from "@/lib/utils/template-helpers"
import type { TemplateSection } from "@/lib/utils/template-helpers"

interface TemplatePreviewProps {
  sections: TemplateSection[]
  templateName: string
}

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  tenant_name: "John Doe",
  tenant_id: "9001015800085",
  tenant_email: "john.doe@example.com",
  tenant_phone: "+27 82 123 4567",
  tenant_address: "123 Main Street, Cape Town",
  landlord_name: "Jane Smith",
  landlord_id: "8002025800086",
  landlord_email: "jane.smith@example.com",
  landlord_phone: "+27 83 987 6543",
  property_address: "456 Oak Avenue, Sandton, Gauteng",
  monthly_rental: "R 15,000.00",
  deposit_amount: "R 30,000.00",
  commencement_date: "2024-01-01",
  termination_date: "2024-12-31"
}

function replaceVariables(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return SAMPLE_DATA[key] || match
  })
}

function renderContent(content: string | string[] | undefined): string {
  if (!content) return ""
  // If it's HTML string, return after variable replacement
  if (typeof content === "string" && (content.includes("<p>") || content.includes("<div>"))) {
    return replaceVariables(content)
  }
  // Otherwise convert to string first
  const contentStr = contentToString(content)
  return replaceVariables(contentStr)
}

export function TemplatePreview({ sections, templateName }: TemplatePreviewProps) {
  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="text-center">{templateName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sections.map((section, index) => {
            if (section.type === "header") {
              return (
                <div key={section.id} className="text-center space-y-2 pb-4 border-b">
                  <h1 className="text-2xl font-bold">{section.title}</h1>
                  {section.subtitle && <p className="text-muted-foreground">{section.subtitle}</p>}
                </div>
              )
            }

            if (section.type === "signatures") {
              return (
                <div key={section.id} className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {renderContent(section.content)}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-8 mt-8">
                    <div className="space-y-2">
                      <div className="border-b border-black h-12"></div>
                      <p className="text-sm font-medium">Tenant Signature</p>
                      <p className="text-xs text-muted-foreground">{SAMPLE_DATA.tenant_name}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="border-b border-black h-12"></div>
                      <p className="text-sm font-medium">Landlord Signature</p>
                      <p className="text-xs text-muted-foreground">{SAMPLE_DATA.landlord_name}</p>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={section.id} className="space-y-4">
                <h3 className="font-semibold text-lg">{section.title}</h3>

                {section.content && (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderContent(section.content) }}
                  />
                )}

                {section.fields && section.fields.length > 0 && (
                  <div className="space-y-2">
                    {section.fields.map((field) => (
                      <div key={field.id} className="flex items-start gap-2">
                        <span className="text-sm font-medium min-w-[120px]">{field.label}:</span>
                        <span className="text-sm text-muted-foreground">
                          {SAMPLE_DATA[field.id] || `[${field.type}]`} {field.suffix || ""}
                        </span>
                        {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                      </div>
                    ))}
                  </div>
                )}

                {section.subsections && section.subsections.length > 0 && (
                  <div className="space-y-4 ml-4 border-l pl-4">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.id} className="space-y-2">
                        <h4 className="font-medium text-sm">{subsection.title}</h4>
                        {subsection.fields.length > 0 && (
                          <div className="space-y-2">
                            {subsection.fields.map((field) => (
                              <div key={field.id} className="flex items-start gap-2">
                                <span className="text-sm font-medium min-w-[120px]">{field.label}:</span>
                                <span className="text-sm text-muted-foreground">
                                  {SAMPLE_DATA[field.id] || `[${field.type}]`} {field.suffix || ""}
                                </span>
                                {field.required && (
                                  <Badge variant="outline" className="text-xs">Required</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {section.footer && (
                  <p className="text-sm text-muted-foreground italic pt-2 border-t">
                    {replaceVariables(section.footer)}
                  </p>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

