"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { updateMovingInspectionItemAction } from "@/actions/moving-inspections-actions"
import { toast } from "sonner"

type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

interface SingleImageAnalysisResult {
  condition: ItemCondition
  commentary: string
  confidence: number
}

interface BatchImageAnalysisResult {
  overallCondition: ItemCondition
  overallCommentary: string
  overallConfidence: number
  imageAnalyses: Array<{
    imageIndex: number
    condition: ItemCondition
    commentary: string
    confidence: number
  }>
}

interface AIAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  mode: "single" | "batch"
  analysisResult?: SingleImageAnalysisResult | BatchImageAnalysisResult
  loading?: boolean
  imageUrls?: string[]
  onApplied?: (condition: ItemCondition, commentary: string) => void
}

export function AIAnalysisDialog({
  open,
  onOpenChange,
  itemId,
  mode,
  analysisResult,
  loading = false,
  imageUrls = [],
  onApplied
}: AIAnalysisDialogProps) {
  const [commentary, setCommentary] = useState("")
  const [applying, setApplying] = useState(false)
  const [openPerImageSections, setOpenPerImageSections] = useState<Set<number>>(new Set())

  // Initialize commentary when result changes
  useEffect(() => {
    if (analysisResult) {
      if (mode === "single") {
        const singleResult = analysisResult as SingleImageAnalysisResult
        setCommentary(singleResult.commentary)
      } else {
        const batchResult = analysisResult as BatchImageAnalysisResult
        setCommentary(batchResult.overallCommentary)
      }
    }
  }, [analysisResult, mode])

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
    }
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence > 0.8) return "High Confidence"
    if (confidence >= 0.5) return "Medium Confidence"
    return "Low Confidence"
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return "bg-green-500"
    if (confidence >= 0.5) return "bg-yellow-500"
    return "bg-orange-500"
  }

  const handleAccept = async () => {
    if (!analysisResult) return

    setApplying(true)
    try {
      let condition: ItemCondition
      let finalCommentary: string

      if (mode === "single") {
        const singleResult = analysisResult as SingleImageAnalysisResult
        condition = singleResult.condition
        finalCommentary = commentary || singleResult.commentary
      } else {
        const batchResult = analysisResult as BatchImageAnalysisResult
        condition = batchResult.overallCondition
        finalCommentary = commentary || batchResult.overallCommentary
      }

      const result = await updateMovingInspectionItemAction(itemId, {
        condition,
        notes: finalCommentary
      })

      if (result.isSuccess) {
        toast.success("AI analysis applied successfully")
        // Notify parent component to update local state
        console.log("[AIAnalysisDialog] Update successful, calling onApplied:", { condition, finalCommentary })
        if (onApplied) {
          onApplied(condition, finalCommentary)
        } else {
          console.warn("[AIAnalysisDialog] onApplied callback not provided")
        }
        onOpenChange(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error applying AI analysis:", error)
      toast.error("Failed to apply AI analysis")
    } finally {
      setApplying(false)
    }
  }

  const togglePerImageSection = (index: number) => {
    const newSet = new Set(openPerImageSections)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setOpenPerImageSections(newSet)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="ai-analysis-dialog-title">AI Image Analysis</DialogTitle>
          <DialogDescription>
            {mode === "single" ? "Review the AI analysis for this image" : "Review the AI analysis for multiple images"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              {mode === "single" ? "Analyzing image..." : `Analyzing ${imageUrls.length} images...`}
            </p>
          </div>
        )}

        {!loading && analysisResult && (
          <div className="space-y-4">
            {mode === "single" ? (
              // Single image mode
              (() => {
                const singleResult = analysisResult as SingleImageAnalysisResult
                return (
                  <>
                    {/* Condition */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Suggested Condition</label>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getConditionColor(singleResult.condition)} text-white`}>
                          {getConditionLabel(singleResult.condition)}
                        </Badge>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Confidence Score</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`${getConfidenceColor(singleResult.confidence)} h-2 rounded-full transition-all`}
                            style={{ width: `${singleResult.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(singleResult.confidence * 100)}% - {getConfidenceLabel(singleResult.confidence)}
                        </span>
                      </div>
                    </div>

                    {/* Commentary */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Commentary</label>
                      <Textarea
                        value={commentary}
                        onChange={(e) => setCommentary(e.target.value)}
                        rows={6}
                        className="text-sm"
                        placeholder="AI-generated commentary..."
                      />
                    </div>
                  </>
                )
              })()
            ) : (
              // Batch mode
              (() => {
                const batchResult = analysisResult as BatchImageAnalysisResult
                return (
                  <>
                    {/* Overall Condition */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Overall Condition</label>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getConditionColor(batchResult.overallCondition)} text-white`}>
                          {getConditionLabel(batchResult.overallCondition)}
                        </Badge>
                      </div>
                    </div>

                    {/* Overall Confidence */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Overall Confidence</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`${getConfidenceColor(batchResult.overallConfidence)} h-2 rounded-full transition-all`}
                            style={{ width: `${batchResult.overallConfidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(batchResult.overallConfidence * 100)}% -{" "}
                          {getConfidenceLabel(batchResult.overallConfidence)}
                        </span>
                      </div>
                    </div>

                    {/* Overall Commentary */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Overall Commentary</label>
                      <Textarea
                        value={commentary}
                        onChange={(e) => setCommentary(e.target.value)}
                        rows={6}
                        className="text-sm"
                        placeholder="AI-generated overall commentary..."
                      />
                    </div>

                    {/* Per-Image Breakdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Per-Image Analysis</label>
                      <div className="space-y-2">
                        {batchResult.imageAnalyses.map((analysis, index) => (
                          <Collapsible
                            key={analysis.imageIndex}
                            open={openPerImageSections.has(analysis.imageIndex)}
                            onOpenChange={() => togglePerImageSection(analysis.imageIndex)}
                          >
                            <div className="border rounded-lg">
                              <CollapsibleTrigger className="w-full">
                                <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                                  <div className="flex items-center gap-2">
                                    {openPerImageSections.has(analysis.imageIndex) ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                    <span className="text-sm font-medium">Image {analysis.imageIndex + 1}</span>
                                    <Badge className={`${getConditionColor(analysis.condition)} text-white text-xs`}>
                                      {getConditionLabel(analysis.condition)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(analysis.confidence * 100)}%
                                    </Badge>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="px-3 pb-3 space-y-2 border-t">
                                  <div className="pt-2">
                                    <label className="text-xs font-medium text-muted-foreground">Commentary</label>
                                    <p className="text-sm mt-1">{analysis.commentary}</p>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={applying || !analysisResult || loading}>
            {applying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              "Accept"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

