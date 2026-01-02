"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Trash2, Sparkles } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

interface ImageGalleryProps {
  images: Array<{
    id: string
    fileUrl: string
    fileName: string
  }>
  onDelete?: (imageId: string) => void
  canDelete?: boolean
  onAnalyze?: (imageId: string, imageUrl: string) => void
  onAnalyzeBatch?: (imageIds: string[], imageUrls: string[]) => void
  canAnalyze?: boolean
}

export function ImageGallery({
  images,
  onDelete,
  canDelete = true,
  onAnalyze,
  onAnalyzeBatch,
  canAnalyze = false
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)

  if (images.length === 0) {
    return null
  }

  const handleToggleBatchMode = () => {
    setBatchMode(!batchMode)
    setSelectedForBatch(new Set())
  }

  const handleToggleSelection = (imageId: string) => {
    const newSet = new Set(selectedForBatch)
    if (newSet.has(imageId)) {
      newSet.delete(imageId)
    } else {
      newSet.add(imageId)
    }
    setSelectedForBatch(newSet)
  }

  const handleSelectAll = () => {
    if (selectedForBatch.size === images.length) {
      setSelectedForBatch(new Set())
    } else {
      setSelectedForBatch(new Set(images.map((img) => img.id)))
    }
  }

  const handleAnalyzeBatch = () => {
    if (onAnalyzeBatch && selectedForBatch.size > 0) {
      const selectedImages = images.filter((img) => selectedForBatch.has(img.id))
      onAnalyzeBatch(
        selectedImages.map((img) => img.id),
        selectedImages.map((img) => img.fileUrl)
      )
      setSelectedForBatch(new Set())
      setBatchMode(false)
    }
  }

  const handleAnalyzeAll = () => {
    if (onAnalyzeBatch) {
      onAnalyzeBatch(
        images.map((img) => img.id),
        images.map((img) => img.fileUrl)
      )
    }
  }

  return (
    <>
      {/* Batch Mode Controls */}
      {canAnalyze && images.length > 1 && (
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant={batchMode ? "default" : "outline"}
            size="sm"
            onClick={handleToggleBatchMode}
            className="h-8 text-xs"
          >
            {batchMode ? "Cancel Selection" : "Select Multiple"}
          </Button>
          {batchMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
                {selectedForBatch.size === images.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedForBatch.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAnalyzeBatch}
                  className="h-8 text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Analyze Selected ({selectedForBatch.size})
                </Button>
              )}
              <Button variant="default" size="sm" onClick={handleAnalyzeAll} className="h-8 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Analyze All
              </Button>
            </>
          )}
        </div>
      )}

      {/* Single Image Analyze All Button */}
      {canAnalyze && images.length > 1 && !batchMode && (
        <div className="mb-2">
          <Button variant="outline" size="sm" onClick={handleAnalyzeAll} className="h-8 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Analyze All Images
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
        {images.map((image) => (
          <div key={image.id} className="relative group aspect-square">
            {/* Checkbox for batch selection */}
            {batchMode && (
              <div className="absolute top-1 left-1 z-10">
                <Checkbox
                  checked={selectedForBatch.has(image.id)}
                  onCheckedChange={() => handleToggleSelection(image.id)}
                  className="bg-white border-2"
                />
              </div>
            )}
            <button
              onClick={() => !batchMode && setSelectedImage(image.fileUrl)}
              className="w-full h-full relative overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <Image
                src={image.fileUrl}
                alt={image.fileName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 33vw, 25vw"
              />
            </button>
            {/* Action buttons overlay */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              {canAnalyze && onAnalyze && !batchMode && (
                <Button
                  variant="default"
                  size="icon"
                  className="h-6 w-6 bg-blue-500 hover:bg-blue-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAnalyze(image.id, image.fileUrl)
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(image.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] w-full p-0 sm:max-w-4xl">
          {selectedImage && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={selectedImage}
                alt="Full size"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

