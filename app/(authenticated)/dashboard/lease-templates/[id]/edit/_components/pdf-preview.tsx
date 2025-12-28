"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, ZoomIn, ZoomOut, FileText } from "lucide-react"
import type { TemplateSection } from "@/lib/utils/template-helpers"

interface PdfPreviewProps {
  sections: TemplateSection[]
  templateName: string
  templateId?: string
}

export function PdfPreview({ sections, templateName, templateId }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)

  const generatePDF = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/lease-templates/preview-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateId,
          sections
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate PDF")
      }

      const data = await response.json()
      
      if (data.success && data.pdf) {
        // Convert base64 to blob URL
        const binaryString = atob(data.pdf)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: data.mimeType || "application/pdf" })
        const url = URL.createObjectURL(blob)
        
        // Clean up previous URL
        setPdfUrl((prevUrl) => {
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl)
          }
          return url
        })
      } else {
        setError("Failed to generate PDF")
      }
    } catch (err) {
      console.error("Error generating PDF:", err)
      setError(err instanceof Error ? err.message : "Failed to generate PDF")
    } finally {
      setLoading(false)
    }
  }, [sections, templateId])

  // Generate PDF when sections change
  useEffect(() => {
    generatePDF()
  }, [generatePDF])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50))
  }

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">PDF Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[50px] text-center">{zoom}%</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generatePDF}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
        {loading && !pdfUrl && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm">Generating PDF preview...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-destructive">
            <p className="text-sm font-medium mb-2">Error generating PDF</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generatePDF}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {pdfUrl && !loading && (
          <div
            className="bg-white shadow-lg"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.2s"
            }}
          >
            <iframe
              src={pdfUrl}
              className="border-0"
              style={{
                width: "210mm", // A4 width
                height: "297mm", // A4 height
                minHeight: "297mm"
              }}
              title="PDF Preview"
            />
          </div>
        )}

        {!pdfUrl && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No PDF preview available</p>
          </div>
        )}
      </div>
    </div>
  )
}

