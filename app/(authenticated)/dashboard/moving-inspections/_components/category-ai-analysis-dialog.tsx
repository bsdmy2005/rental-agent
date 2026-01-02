"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { updateMovingInspectionItemsBulkFromAIAction } from "@/actions/moving-inspections-actions"
import { toast } from "sonner"

type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

interface ItemAnalysisResult {
  itemId: string
  itemName: string
  condition: ItemCondition
  commentary: string
  confidence: number
}

interface CategoryAIAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysisResults: ItemAnalysisResult[]
  loading?: boolean
}

export function CategoryAIAnalysisDialog({
  open,
  onOpenChange,
  analysisResults,
  loading = false
}: CategoryAIAnalysisDialogProps) {
  const router = useRouter()
  const [commentaries, setCommentaries] = useState<Record<string, string>>({})
  const [applying, setApplying] = useState(false)

  // Initialize commentaries when results change
  useEffect(() => {
    if (analysisResults.length > 0) {
      const initialCommentaries: Record<string, string> = {}
      analysisResults.forEach((result) => {
        initialCommentaries[result.itemId] = result.commentary
      })
      setCommentaries(initialCommentaries)
    }
  }, [analysisResults])

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
    if (analysisResults.length === 0) return

    setApplying(true)
    try {
      const updates = analysisResults.map((result) => ({
        itemId: result.itemId,
        condition: result.condition,
        notes: commentaries[result.itemId] || result.commentary
      }))

      const result = await updateMovingInspectionItemsBulkFromAIAction(updates)

      if (result.isSuccess) {
        toast.success(`AI analysis applied to ${result.data?.length || 0} items successfully`)
        // Try to refresh - works for server components, may not work for client components
        try {
          router.refresh()
        } catch (refreshError) {
          // Ignore refresh errors - data is already updated via API
          console.debug("Router refresh not available in this context")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="category-ai-analysis-dialog-title">Category AI Analysis Results</DialogTitle>
          <DialogDescription>
            Review the AI analysis for all items in this category. You can edit the commentary for each item before applying.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing items...</p>
          </div>
        )}

        {!loading && analysisResults.length > 0 && (
          <div className="space-y-4">
            {analysisResults.map((result) => (
              <div key={result.itemId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{result.itemName}</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getConditionColor(result.condition)} text-white`}>
                      {getConditionLabel(result.condition)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(result.confidence * 100)}% - {getConfidenceLabel(result.confidence)}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Commentary</label>
                  <Textarea
                    value={commentaries[result.itemId] || result.commentary}
                    onChange={(e) =>
                      setCommentaries((prev) => ({
                        ...prev,
                        [result.itemId]: e.target.value
                      }))
                    }
                    rows={4}
                    className="text-sm"
                    placeholder="AI-generated commentary..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && analysisResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No analysis results available
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={applying || analysisResults.length === 0 || loading}>
            {applying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply All (${analysisResults.length} items)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

