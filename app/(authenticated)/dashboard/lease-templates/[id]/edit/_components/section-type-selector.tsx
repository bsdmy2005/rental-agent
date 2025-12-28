"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Heading, PenTool } from "lucide-react"

interface SectionTypeSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (type: "header" | "section" | "signatures") => void
}

const SECTION_TYPES = [
  {
    type: "header" as const,
    title: "Header",
    description: "Document header with title and subtitle",
    icon: Heading,
    example: "RESIDENTIAL LEASE AGREEMENT\n(South Africa)"
  },
  {
    type: "section" as const,
    title: "Section",
    description: "Standard content section with text, fields, and subsections",
    icon: FileText,
    example: "1. PARTIES\nThis Lease Agreement..."
  },
  {
    type: "signatures" as const,
    title: "Signatures",
    description: "Signature section for tenant and landlord",
    icon: PenTool,
    example: "20. SIGNATURES\nSIGNED at..."
  }
]

export function SectionTypeSelector({ open, onClose, onSelect }: SectionTypeSelectorProps) {
  const handleSelect = (type: "header" | "section" | "signatures") => {
    onSelect(type)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>Select the type of section you want to add to your template.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          {SECTION_TYPES.map((sectionType) => {
            const Icon = sectionType.icon
            return (
              <Card
                key={sectionType.type}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelect(sectionType.type)}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{sectionType.title}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">{sectionType.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground font-mono whitespace-pre-line">
                    {sectionType.example}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

