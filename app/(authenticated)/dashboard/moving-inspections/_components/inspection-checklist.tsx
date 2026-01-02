"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InspectionItemRow } from "./inspection-item-row"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react"
import { updateMovingInspectionItemsBulkAction } from "@/actions/moving-inspections-actions"
import { analyzeCategoryItemsBulkAction } from "@/actions/inspection-ai-actions"
import { CategoryAIAnalysisDialog } from "./category-ai-analysis-dialog"
import { toast } from "sonner"

type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

interface InspectionChecklistProps {
  inspectionId: string
  inspectionType: "moving_in" | "moving_out"
  isLocked: boolean
  isReadOnly?: boolean // If true, items are read-only (e.g., after signing)
  inspectorToken?: string // Optional token for third-party inspector access
  items: Array<{
    id: string
    name: string
    condition: ItemCondition | null
    isPresent: boolean | null
    notes: string | null
    confirmedAsPrevious?: boolean
    moveInItemId?: string | null
    category: {
      name: string
      displayOrder: number
    }
    defects: Array<{
      id: string
      description: string
      severity: "minor" | "moderate" | "major"
      isRepairable: boolean
    }>
  }>
}

export function InspectionChecklist({
  inspectionId,
  inspectionType,
  isLocked,
  isReadOnly = false,
  inspectorToken,
  items
}: InspectionChecklistProps) {
  const router = useRouter()
  const [categoryOpenStates, setCategoryOpenStates] = useState<Record<string, boolean>>({})
  const [bulkUpdating, setBulkUpdating] = useState<Record<string, boolean>>({})
  const [analyzingCategory, setAnalyzingCategory] = useState<string | null>(null)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiAnalysisResults, setAIAnalysisResults] = useState<Array<{ itemId: string; itemName: string; condition: ItemCondition; commentary: string; confidence: number }>>([])

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const categoryName = item.category.name
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, typeof items>)

  const categories = Object.keys(itemsByCategory).sort((a, b) => {
    const aOrder = items.find((i) => i.category.name === a)?.category.displayOrder || 0
    const bOrder = items.find((i) => i.category.name === b)?.category.displayOrder || 0
    return aOrder - bOrder
  })

  const toggleCategory = (categoryName: string) => {
    setCategoryOpenStates((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }))
  }

  const handleBulkUpdate = async (categoryName: string, categoryItems: typeof items, condition: ItemCondition) => {
    setBulkUpdating((prev) => ({ ...prev, [categoryName]: true }))
    try {
      const itemIds = categoryItems.map((item) => item.id)
      const result = await updateMovingInspectionItemsBulkAction(itemIds, condition)
      if (result.isSuccess) {
        toast.success(`Successfully updated ${result.data?.length || 0} items`)
        // Refresh the page to show updated conditions
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error("Error updating items in bulk:", error)
      toast.error("Failed to update items")
    } finally {
      setBulkUpdating((prev) => ({ ...prev, [categoryName]: false }))
    }
  }

  const handleAnalyzeAllItems = async (categoryName: string, categoryItems: typeof items) => {
    setAnalyzingCategory(categoryName)
    setShowAIDialog(true)
    setAIAnalysisResults([])

    try {
      const itemIds = categoryItems.map((item) => item.id)
      const result = await analyzeCategoryItemsBulkAction(inspectionId, itemIds)

      if (result.isSuccess && result.data) {
        // Map results to include item names
        const resultsWithNames = result.data.map((analysis) => {
          const item = categoryItems.find((i) => i.id === analysis.itemId)
          return {
            ...analysis,
            itemName: item?.name || "Unknown Item"
          }
        })
        setAIAnalysisResults(resultsWithNames)
      } else {
        toast.error(result.message || "Failed to analyze items")
        setShowAIDialog(false)
      }
    } catch (error) {
      console.error("Error analyzing category items:", error)
      toast.error("Failed to analyze items")
      setShowAIDialog(false)
    } finally {
      setAnalyzingCategory(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Row - Hidden on mobile, shown on desktop */}
      <div className="hidden md:grid grid-cols-[1fr_auto_12rem] gap-4 px-4 py-2 border-b font-semibold text-sm text-muted-foreground">
        <div>Item</div>
        <div className="text-center">Condition</div>
        <div>Comment</div>
      </div>

      {/* Categories */}
      {categories.map((categoryName) => {
        const categoryItems = itemsByCategory[categoryName]
        const isOpen = categoryOpenStates[categoryName] || false
        const isBulkUpdating = bulkUpdating[categoryName] || false
        const isAnalyzing = analyzingCategory === categoryName
        
        return (
          <Collapsible key={categoryName} open={isOpen} onOpenChange={() => toggleCategory(categoryName)}>
            <div className="border rounded-lg">
              <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                <CollapsibleTrigger className="flex-1 flex items-center gap-2">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <CardTitle className="text-base">{categoryName}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {categoryItems.length} items
                  </Badge>
                </CollapsibleTrigger>
                
                {isLocked && !isReadOnly && (
                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkUpdate(categoryName, categoryItems, "good")}
                      disabled={isBulkUpdating || isAnalyzing}
                      className="h-7 text-xs"
                    >
                      {isBulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "All Good"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkUpdate(categoryName, categoryItems, "requires_repair")}
                      disabled={isBulkUpdating || isAnalyzing}
                      className="h-7 text-xs"
                    >
                      {isBulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "All Repair"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkUpdate(categoryName, categoryItems, "requires_cleaning")}
                      disabled={isBulkUpdating || isAnalyzing}
                      className="h-7 text-xs"
                    >
                      {isBulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "All Cleaning"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkUpdate(categoryName, categoryItems, "requires_repair_and_cleaning")}
                      disabled={isBulkUpdating || isAnalyzing}
                      className="h-7 text-xs"
                    >
                      {isBulkUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : "All Both"}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAnalyzeAllItems(categoryName, categoryItems)}
                      disabled={isBulkUpdating || isAnalyzing}
                      className="h-7 text-xs"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Analyze All
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <CollapsibleContent>
                <div className="px-2 sm:px-4 pb-4 border-t">
                  <div className="space-y-2">
                    {categoryItems.map((item) => (
                      <InspectionItemRow
                        key={item.id}
                        item={item}
                        inspectionId={inspectionId}
                        inspectionType={inspectionType}
                        isLocked={isLocked}
                        isReadOnly={isReadOnly}
                        inspectorToken={inspectorToken}
                      />
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      {/* Category AI Analysis Dialog */}
      <CategoryAIAnalysisDialog
        open={showAIDialog}
        onOpenChange={(open) => {
          setShowAIDialog(open)
          if (!open) {
            setAIAnalysisResults([])
            setAnalyzingCategory(null)
          }
        }}
        analysisResults={aiAnalysisResults}
        loading={analyzingCategory !== null}
      />
    </div>
  )
}

