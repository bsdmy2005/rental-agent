"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronDown, ChevronUp, Camera, Upload } from "lucide-react"
import { DefectForm } from "./defect-form"
import { updateMovingInspectionItemAction } from "@/actions/moving-inspections-actions"
import { getInspectionItemImagesAction, deleteInspectionItemImageAction } from "@/actions/inspection-attachments-actions"
import { analyzeInspectionImageAction, analyzeInspectionImagesBatchAction } from "@/actions/inspection-ai-actions"
import { CameraCapture } from "@/components/utility/camera-capture"
import { ImageGallery } from "@/components/utility/image-gallery"
import { AIAnalysisDialog } from "./ai-analysis-dialog"
import { toast } from "sonner"

type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

interface InspectionItemRowProps {
  inspectionId: string
  inspectionType: "moving_in" | "moving_out"
  isLocked: boolean
  isReadOnly?: boolean // If true, item is read-only (e.g., after signing)
  inspectorToken?: string // Optional token for third-party inspector access
  item: {
    id: string
    name: string
    condition: ItemCondition | null
    isPresent: boolean | null
    notes: string | null
    confirmedAsPrevious?: boolean
    moveInItemId?: string | null
    defects: Array<{
      id: string
      description: string
      severity: "minor" | "moderate" | "major"
      isRepairable: boolean
    }>
  }
}

export function InspectionItemRow({
  inspectionId,
  inspectionType,
  isLocked,
  isReadOnly = false,
  inspectorToken,
  item
}: InspectionItemRowProps) {
  const [showDefects, setShowDefects] = useState(false)
  const [condition, setCondition] = useState<ItemCondition | null>(item.condition)
  const [notes, setNotes] = useState(item.notes || "")
  const [confirmedAsPrevious, setConfirmedAsPrevious] = useState(item.confirmedAsPrevious || false)
  const [updating, setUpdating] = useState(false)
  const [images, setImages] = useState<Array<{ id: string; fileUrl: string; fileName: string }>>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiAnalysisResult, setAIAnalysisResult] = useState<any>(null)
  const [aiAnalysisMode, setAIAnalysisMode] = useState<"single" | "batch">("single")
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingImageUrls, setAnalyzingImageUrls] = useState<string[]>([])
  const conditionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync condition state when item prop changes
  useEffect(() => {
    setCondition(item.condition)
  }, [item.condition])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (conditionUpdateTimeoutRef.current) {
        clearTimeout(conditionUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Load images on mount
  useEffect(() => {
    loadImages()
  }, [item.id])

  const loadImages = async () => {
    setLoadingImages(true)
    const result = await getInspectionItemImagesAction(item.id)
    if (result.isSuccess && result.data) {
      setImages(result.data.map((img) => ({ id: img.id, fileUrl: img.fileUrl, fileName: img.fileName })))
    }
    setLoadingImages(false)
  }

  const handleConditionChange = async (value: ItemCondition) => {
    // Don't update if already updating or if value hasn't changed
    if (updating || value === condition) {
      return
    }

    const previousValue = condition
    setCondition(value) // Immediate optimistic update
    
    // Debounced save (500ms delay)
    if (conditionUpdateTimeoutRef.current) {
      clearTimeout(conditionUpdateTimeoutRef.current)
    }
    
    conditionUpdateTimeoutRef.current = setTimeout(async () => {
      setUpdating(true)
      try {
        let result
        if (inspectorToken) {
          // Use inspector API for third-party inspectors
          const response = await fetch("/api/inspections/update/inspector", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inspectorToken, itemId: item.id, condition: value })
          })
          const data = await response.json()
          result = { isSuccess: data.success, message: data.message || data.error }
        } else {
          // Use authenticated action for logged-in users
          result = await updateMovingInspectionItemAction(item.id, { condition: value })
        }
        if (!result.isSuccess) {
          toast.error(result.message)
          setCondition(previousValue) // Revert on error
        }
      } catch (error) {
        console.error("Error updating condition:", error)
        toast.error("Failed to update condition")
        setCondition(previousValue) // Revert on error
      } finally {
        setUpdating(false)
      }
    }, 500)
  }

  const handleNotesChange = async (value: string) => {
    setNotes(value)
    // Debounce: update after user stops typing
    const timeoutId = setTimeout(async () => {
      setUpdating(true)
      try {
        let result
        if (inspectorToken) {
          // Use inspector API for third-party inspectors
          const response = await fetch("/api/inspections/update/inspector", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: inspectorToken, itemId: item.id, notes: value || null })
          })
          const data = await response.json()
          result = { isSuccess: data.success, message: data.message || data.error }
        } else {
          // Use authenticated action for logged-in users
          result = await updateMovingInspectionItemAction(item.id, { notes: value || null })
        }
        if (!result.isSuccess) {
          toast.error(result.message)
        }
      } catch (error) {
        console.error("Error updating notes:", error)
        toast.error("Failed to update notes")
      } finally {
        setUpdating(false)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }

  const handleConfirmAsPrevious = async (checked: boolean) => {
    setConfirmedAsPrevious(checked)
    setUpdating(true)
    try {
      let result
      if (inspectorToken) {
        // Use inspector API for third-party inspectors
        const response = await fetch("/api/inspections/update/inspector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inspectorToken, itemId: item.id, confirmedAsPrevious: checked })
        })
        const data = await response.json()
        result = { isSuccess: data.success, message: data.message || data.error }
      } else {
        // Use authenticated action for logged-in users
        result = await updateMovingInspectionItemAction(item.id, {
          confirmedAsPrevious: checked
        })
      }
      if (!result.isSuccess) {
        toast.error(result.message)
        setConfirmedAsPrevious(!checked) // Revert on error
      }
    } catch (error) {
      console.error("Error updating confirmed as previous:", error)
      toast.error("Failed to update")
      setConfirmedAsPrevious(!checked) // Revert on error
    } finally {
      setUpdating(false)
    }
  }

  const handleImageCapture = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("itemId", item.id)
    formData.append("inspectionId", inspectionId)
    
    // Add inspector token if available (for third-party inspector access)
    if (inspectorToken) {
      formData.append("inspectorToken", inspectorToken)
    }

    try {
      // Use inspector-specific endpoint if token is provided, otherwise use standard endpoint
      const endpoint = inspectorToken ? "/api/inspections/images/inspector" : "/api/inspections/upload-image"
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload image")
      }

      toast.success("Image uploaded successfully")
      loadImages() // Reload images
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error(error instanceof Error ? error.message : "Failed to upload image")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageCapture(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    const result = await deleteInspectionItemImageAction(imageId)
    if (result.isSuccess) {
      toast.success("Image deleted")
      loadImages() // Reload images
    } else {
      toast.error(result.message)
    }
  }

  const handleAnalyzeImage = async (imageId: string, imageUrl: string) => {
    setAnalyzing(true)
    setAIAnalysisMode("single")
    setAnalyzingImageUrls([imageUrl])
    setShowAIDialog(true)
    setAIAnalysisResult(null)

    try {
      const result = await analyzeInspectionImageAction(imageUrl, item.id)
      if (result.isSuccess && result.data) {
        setAIAnalysisResult(result.data)
      } else {
        toast.error(result.message || "Failed to analyze image")
        setShowAIDialog(false)
      }
    } catch (error) {
      console.error("Error analyzing image:", error)
      toast.error("Failed to analyze image")
      setShowAIDialog(false)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAnalyzeBatch = async (imageIds: string[], imageUrls: string[]) => {
    if (imageUrls.length === 0) return

    setAnalyzing(true)
    setAIAnalysisMode("batch")
    setAnalyzingImageUrls(imageUrls)
    setShowAIDialog(true)
    setAIAnalysisResult(null)

    try {
      const result = await analyzeInspectionImagesBatchAction(imageUrls, item.id)
      if (result.isSuccess && result.data) {
        setAIAnalysisResult(result.data)
      } else {
        toast.error(result.message || "Failed to analyze images")
        setShowAIDialog(false)
      }
    } catch (error) {
      console.error("Error analyzing images:", error)
      toast.error("Failed to analyze images")
      setShowAIDialog(false)
    } finally {
      setAnalyzing(false)
    }
  }

  const getConditionLabel = (cond: ItemCondition) => {
    switch (cond) {
      case "good":
        return "Good"
      case "requires_repair":
        return "Requires Repair"
      case "requires_cleaning":
        return "Requires Cleaning"
      case "requires_repair_and_cleaning":
        return "Requires Repair & Cleaning"
      default:
        return cond
    }
  }

  const getConditionColor = (cond: ItemCondition) => {
    switch (cond) {
      case "good":
        return "bg-green-500"
      case "requires_repair":
        return "bg-orange-500"
      case "requires_cleaning":
        return "bg-yellow-500"
      case "requires_repair_and_cleaning":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getConditionBackgroundColor = (cond: ItemCondition | null) => {
    if (!cond) {
      return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900"
    }
    switch (cond) {
      case "good":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
      case "requires_repair":
        return "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
      case "requires_cleaning":
        return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
      case "requires_repair_and_cleaning":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
      default:
        return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900"
    }
  }

  const isMoveOut = inspectionType === "moving_out"
  const canEdit = isLocked && !isReadOnly // Can edit if locked and not read-only

  return (
    <div className={`border-l-4 ${getConditionBackgroundColor(condition)} rounded-r-md p-3 transition-colors`}>
      <div className="space-y-3">
        {/* Top Row: Item Name with Status Badge (Mobile-first) */}
        <div className="flex items-start justify-between gap-2">
          {/* Item Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{item.name}</span>
              {confirmedAsPrevious && isMoveOut && (
                <Badge variant="secondary" className="text-xs">
                  Same as Move-In
                </Badge>
              )}
            </div>
          </div>

          {/* Status Badge - Top Right */}
          <div className="shrink-0">
            {condition && (
              <Badge className={`${getConditionColor(condition)} text-white text-xs whitespace-nowrap`}>
                {getConditionLabel(condition)}
              </Badge>
            )}
            {!condition && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Not Set
            </Badge>
            )}
          </div>
        </div>

        {/* Condition Selector - Bottom (Mobile-first, stacked) */}
        <div className="w-full">
          {!canEdit ? (
            <div className="text-xs text-muted-foreground">
              {isReadOnly ? "Read-only (signed)" : "Lock inspection to edit"}
            </div>
          ) : (
            <RadioGroup
              key={`condition-${item.id}-${condition || 'null'}`}
              value={condition || undefined}
              onValueChange={(value) => {
                if (!updating) {
                  handleConditionChange(value as ItemCondition)
                }
              }}
              disabled={updating || !canEdit}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="good" id={`good-${item.id}`} disabled={updating} />
                <Label htmlFor={`good-${item.id}`} className="text-xs cursor-pointer">
                  Good
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="requires_repair" id={`repair-${item.id}`} disabled={updating} />
                <Label htmlFor={`repair-${item.id}`} className="text-xs cursor-pointer">
                  Repair
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="requires_cleaning" id={`cleaning-${item.id}`} disabled={updating} />
                <Label htmlFor={`cleaning-${item.id}`} className="text-xs cursor-pointer">
                  Cleaning
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="requires_repair_and_cleaning"
                  id={`both-${item.id}`}
                  disabled={updating}
                />
                <Label htmlFor={`both-${item.id}`} className="text-xs cursor-pointer">
                  Both
                </Label>
              </div>
            </RadioGroup>
          )}
        </div>

        {/* Comment Field */}
        <div className="w-full">
          <Input
            id={`comment-${item.id}`}
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add comment..."
            disabled={updating || !canEdit}
            className="text-sm w-full"
          />
        </div>

        {/* Move-Out: Confirm as Previous */}
        {isMoveOut && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              id={`confirm-${item.id}`}
              checked={confirmedAsPrevious}
              onChange={(e) => handleConfirmAsPrevious(e.target.checked)}
              disabled={updating || !canEdit}
              className="h-4 w-4"
            />
            <Label htmlFor={`confirm-${item.id}`} className="text-xs cursor-pointer">
              Confirm as previous (same as move-in)
            </Label>
          </div>
        )}

        {/* Images Section */}
        {canEdit && (
          <div className="px-1 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCamera(true)}
                className="h-8 text-xs"
              >
                <Camera className="h-3 w-3 mr-1" />
                Capture
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            {!loadingImages && (
              <ImageGallery
                images={images}
                onDelete={handleDeleteImage}
                canDelete={canEdit}
                onAnalyze={handleAnalyzeImage}
                onAnalyzeBatch={handleAnalyzeBatch}
                canAnalyze={canEdit}
              />
            )}
          </div>
        )}
        {/* Show images in read-only mode */}
        {isReadOnly && !loadingImages && images.length > 0 && (
          <div className="px-1 space-y-2">
            <ImageGallery
              images={images}
              onDelete={() => {}} // No delete in read-only
              canDelete={false}
              onAnalyze={() => {}} // No analyze in read-only
              onAnalyzeBatch={() => {}} // No analyze in read-only
              canAnalyze={false}
            />
          </div>
        )}

        {/* Defects Section - Collapsible */}
        {item.defects.length > 0 && (
          <div className="mt-2 ml-0">
          <Button
            variant="ghost"
              size="sm"
            onClick={() => setShowDefects(!showDefects)}
              className="text-xs h-7"
          >
            {showDefects ? (
                <ChevronUp className="mr-1 h-3 w-3" />
            ) : (
                <ChevronDown className="mr-1 h-3 w-3" />
            )}
              {item.defects.length} defect{item.defects.length !== 1 ? "s" : ""}
          </Button>
      {showDefects && (
              <div className="mt-2 space-y-2">
          {item.defects.map((defect) => (
                  <div key={defect.id} className="bg-muted p-2 rounded text-sm">
              <div className="flex items-center justify-between">
                      <span>{defect.description}</span>
                      <div className="flex items-center gap-2">
                <Badge variant="outline">{defect.severity}</Badge>
                        {defect.isRepairable ? (
                          <Badge variant="default" className="bg-orange-500">
                            Repairable
                          </Badge>
                        ) : (
                          <Badge variant="secondary">As-Is</Badge>
                        )}
                      </div>
              </div>
            </div>
          ))}
                {canEdit && (
          <DefectForm itemId={item.id} inspectionId={inspectionId} />
                )}
              </div>
            )}
        </div>
      )}
      </div>

      {/* Camera Capture Dialog */}
      <CameraCapture
        isOpen={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handleImageCapture}
      />

      {/* AI Analysis Dialog */}
      <AIAnalysisDialog
        open={showAIDialog}
        onOpenChange={(open) => {
          setShowAIDialog(open)
          if (!open) {
            setAIAnalysisResult(null)
            setAnalyzingImageUrls([])
          }
        }}
        itemId={item.id}
        mode={aiAnalysisMode}
        analysisResult={aiAnalysisResult}
        loading={analyzing}
        imageUrls={analyzingImageUrls}
        onApplied={(condition, commentary) => {
          // Update local state when AI analysis is applied
          console.log("[InspectionItemRow] AI analysis applied:", { condition, commentary })
          setCondition(condition)
          setNotes(commentary)
        }}
      />
    </div>
  )
}
