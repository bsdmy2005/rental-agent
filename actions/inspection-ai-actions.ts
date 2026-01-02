"use server"

import { auth } from "@clerk/nextjs/server"
import { ActionState } from "@/types"
import { downloadPDFFromSupabase } from "@/lib/storage/supabase-storage"
import {
  analyzeInspectionImage,
  analyzeInspectionImagesBatch,
  InspectionImageAnalysisResult,
  BatchInspectionImageAnalysisResult
} from "@/lib/inspection-image-analysis"

export type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

/**
 * Analyze a single inspection image
 */
export async function analyzeInspectionImageAction(
  imageUrl: string,
  itemId: string
): Promise<ActionState<InspectionImageAnalysisResult>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    console.log(`[Inspection AI Action] Analyzing image for item: ${itemId}`)

    // Download image from Supabase
    let imageBuffer: Buffer
    try {
      imageBuffer = await downloadPDFFromSupabase(imageUrl)
      console.log(`[Inspection AI Action] ✓ Downloaded image (${imageBuffer.length} bytes)`)
    } catch (error) {
      console.error("[Inspection AI Action] Error downloading image:", error)
      return {
        isSuccess: false,
        message: `Failed to download image: ${error instanceof Error ? error.message : "Unknown error"}`
      }
    }

    // Extract filename from URL or use default
    const urlParts = imageUrl.split("/")
    const fileName = urlParts[urlParts.length - 1] || `inspection-image-${Date.now()}.jpg`

    // Analyze image directly with buffer (Chat Completions API with vision)
    let analysisResult: InspectionImageAnalysisResult
    try {
      analysisResult = await analyzeInspectionImage(imageBuffer, fileName)
      console.log(`[Inspection AI Action] ✓ Analysis completed`)
    } catch (error) {
      console.error("[Inspection AI Action] Error analyzing image:", error)
      return {
        isSuccess: false,
        message: `Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`
      }
    }

    return {
      isSuccess: true,
      message: "Image analyzed successfully",
      data: analysisResult
    }
  } catch (error) {
    console.error("[Inspection AI Action] Unexpected error:", error)
    return {
      isSuccess: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

/**
 * Analyze multiple inspection images together
 */
export async function analyzeInspectionImagesBatchAction(
  imageUrls: string[],
  itemId: string
): Promise<ActionState<BatchInspectionImageAnalysisResult>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    if (imageUrls.length === 0) {
      return { isSuccess: false, message: "No images provided for analysis" }
    }

    console.log(`[Inspection AI Action] Analyzing ${imageUrls.length} images for item: ${itemId}`)

    // Download all images from Supabase
    const imageBuffers: Array<{ buffer: Buffer; fileName: string }> = []
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const buffer = await downloadPDFFromSupabase(imageUrls[i])
        const urlParts = imageUrls[i].split("/")
        const fileName = urlParts[urlParts.length - 1] || `inspection-image-${i}-${Date.now()}.jpg`
        imageBuffers.push({ buffer, fileName })
        console.log(`[Inspection AI Action] ✓ Downloaded image ${i + 1}/${imageUrls.length}`)
      } catch (error) {
        console.error(`[Inspection AI Action] Error downloading image ${i + 1}:`, error)
        return {
          isSuccess: false,
          message: `Failed to download image ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`
        }
      }
    }

    // Analyze images batch directly with buffers (Chat Completions API with vision)
    let analysisResult: BatchInspectionImageAnalysisResult
    try {
      analysisResult = await analyzeInspectionImagesBatch(imageBuffers)
      console.log(`[Inspection AI Action] ✓ Batch analysis completed`)
    } catch (error) {
      console.error("[Inspection AI Action] Error analyzing images batch:", error)
      return {
        isSuccess: false,
        message: `Failed to analyze images: ${error instanceof Error ? error.message : "Unknown error"}`
      }
    }

    return {
      isSuccess: true,
      message: `Successfully analyzed ${imageUrls.length} images`,
      data: analysisResult
    }
  } catch (error) {
    console.error("[Inspection AI Action] Unexpected error:", error)
    return {
      isSuccess: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

/**
 * Analyze all items in a category in parallel
 * For each item, analyzes all its images together and returns per-item assessments
 */
export async function analyzeCategoryItemsBulkAction(
  inspectionId: string,
  itemIds: string[]
): Promise<ActionState<Array<{ itemId: string; condition: ItemCondition; commentary: string; confidence: number }>>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    if (itemIds.length === 0) {
      return { isSuccess: false, message: "No items provided" }
    }

    console.log(`[Inspection AI Action] Analyzing ${itemIds.length} items in category for inspection: ${inspectionId}`)

    // Import actions needed
    const { getInspectionItemImagesAction } = await import("@/actions/inspection-attachments-actions")

    // Process all items in parallel
    const analysisPromises = itemIds.map(async (itemId) => {
      try {
        // Get all images for this item
        const imagesResult = await getInspectionItemImagesAction(itemId)
        if (!imagesResult.isSuccess || !imagesResult.data || imagesResult.data.length === 0) {
          // Item has no images, skip it
          return null
        }

        const imageUrls = imagesResult.data.map((img) => img.fileUrl)

        // Analyze images for this item using batch analysis
        const batchResult = await analyzeInspectionImagesBatchAction(imageUrls, itemId)
        if (!batchResult.isSuccess || !batchResult.data) {
          console.error(`[Inspection AI Action] Failed to analyze item ${itemId}:`, batchResult.message)
          return null
        }

        // Extract overall assessment from batch result
        return {
          itemId,
          condition: batchResult.data.overallCondition,
          commentary: batchResult.data.overallCommentary,
          confidence: batchResult.data.overallConfidence
        }
      } catch (error) {
        console.error(`[Inspection AI Action] Error analyzing item ${itemId}:`, error)
        return null
      }
    })

    // Wait for all analyses to complete
    const results = await Promise.all(analysisPromises)

    // Filter out null results (items with no images or failed analyses)
    const validResults = results.filter((r): r is { itemId: string; condition: ItemCondition; commentary: string; confidence: number } => r !== null)

    if (validResults.length === 0) {
      return { isSuccess: false, message: "No items with images found or all analyses failed" }
    }

    console.log(`[Inspection AI Action] ✓ Successfully analyzed ${validResults.length} items`)

    return {
      isSuccess: true,
      message: `Successfully analyzed ${validResults.length} items`,
      data: validResults
    }
  } catch (error) {
    console.error("[Inspection AI Action] Unexpected error in category bulk analysis:", error)
    return {
      isSuccess: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

