"use client"

import Image from "next/image"
import { Download, Eye, FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface ExpenseAttachmentCardProps {
  attachment: {
    id: string
    fileUrl: string
    fileName: string
    fileType: string
  }
}

export function ExpenseAttachmentCard({ attachment }: ExpenseAttachmentCardProps) {
  const handleView = () => {
    window.open(attachment.fileUrl, "_blank", "noopener,noreferrer")
  }

  const handleDownload = () => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a")
    link.href = attachment.fileUrl
    link.download = attachment.fileName
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="relative group overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-video w-full">
        {attachment.fileType === "image" ? (
          <Image
            src={attachment.fileUrl}
            alt={attachment.fileName}
            fill
            className="object-cover cursor-pointer transition-opacity hover:opacity-90"
            onClick={handleView}
          />
        ) : (
          <div 
            className="flex items-center justify-center h-full bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
            onClick={handleView}
          >
            <FileText className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleView}
              className="bg-white/90 hover:bg-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="bg-white/90 hover:bg-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
      
      {/* File name and actions bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-xs font-medium truncate flex-1 mr-2">
            {attachment.fileName}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleView}>
                <Eye className="h-4 w-4 mr-2" />
                View in New Tab
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

