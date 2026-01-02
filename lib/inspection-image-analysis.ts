"use server"

import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"

// Explicitly load .env.local
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("[Inspection Image Analysis] ERROR: OPENAI_API_KEY is not set in process.env")
}

const openai = new OpenAI({
  apiKey: apiKey
})

/**
 * OpenAI Model Configuration
 * 
 * The model to use for inspection image analysis can be configured via the OPENAI_MODEL
 * environment variable. If not set, defaults to "gpt-4o" (which supports vision).
 * 
 * To configure, add to your .env.local file:
 * OPENAI_MODEL=gpt-4o
 * 
 * Supported models: Any OpenAI model that supports vision (Chat Completions API with images).
 * Recommended: gpt-4o, gpt-4o-mini, or gpt-5.x models with vision support.
 * Note: The code will automatically fallback to "gpt-4o" if the configured model doesn't support vision.
 */
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o"

export type ItemCondition = "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning"

export interface InspectionImageAnalysisResult {
  condition: ItemCondition
  commentary: string
  confidence: number
}

export interface BatchInspectionImageAnalysisResult {
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

// JSON Schema for single image analysis
const INSPECTION_IMAGE_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    condition: {
      type: "string",
      enum: ["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"],
      description: "The condition state of the item based on the image"
    },
    commentary: {
      type: "string",
      description: "Detailed commentary describing what is seen in the image, including defects, damage, cleanliness issues, etc."
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence score (0-1) indicating how confident the AI is in its assessment"
    }
  },
  required: ["condition", "commentary", "confidence"],
  additionalProperties: false
} as const

// JSON Schema for batch analysis (multiple images)
const BATCH_INSPECTION_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    overallCondition: {
      type: "string",
      enum: ["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"],
      description: "The overall condition state considering all images"
    },
    overallCommentary: {
      type: "string",
      description: "Comprehensive commentary describing what is seen across all images"
    },
    overallConfidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Overall confidence score considering all images"
    },
    imageAnalyses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          imageIndex: { type: "number" },
          condition: {
            type: "string",
            enum: ["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"]
          },
          commentary: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["imageIndex", "condition", "commentary", "confidence"],
        additionalProperties: false
      }
    }
  },
  required: ["overallCondition", "overallCommentary", "overallConfidence", "imageAnalyses"],
  additionalProperties: false
} as const

/**
 * Convert image buffer to base64 data URL for Chat Completions API
 */
function imageBufferToBase64(imageBuffer: Buffer, fileName: string): string {
  const base64 = imageBuffer.toString("base64")
  const ext = fileName.toLowerCase().split(".").pop()
  let mimeType = "image/jpeg"
  if (ext === "png") mimeType = "image/png"
  else if (ext === "gif") mimeType = "image/gif"
  else if (ext === "webp") mimeType = "image/webp"
  return `data:${mimeType};base64,${base64}`
}

/**
 * Analyze a single inspection image using OpenAI Chat Completions API with vision
 */
export async function analyzeInspectionImage(
  imageBuffer: Buffer,
  fileName: string
): Promise<InspectionImageAnalysisResult> {
  try {
    console.log(`[Inspection Image Analysis] Starting analysis for image: ${fileName}`)

    // Convert image to base64 data URL
    const imageDataUrl = imageBufferToBase64(imageBuffer, fileName)

    const systemPrompt = `You are an expert property inspector analyzing images of rental property items. Your task is to assess the condition of items shown in inspection images.

For each image, you must:
1. Assess the condition of the item based on what you see
2. Select one of the four condition states:
   - "good": Item is in good condition, no issues visible
   - "requires_repair": Item has damage or defects that need repair
   - "requires_cleaning": Item is dirty or needs cleaning but no repair needed
   - "requires_repair_and_cleaning": Item needs both repair and cleaning
3. Generate detailed, professional commentary describing:
   - What you see in the image
   - Specific defects, damage, or cleanliness issues (if any)
   - Location and extent of any problems
   - Any other relevant observations
4. Provide a confidence score (0-1) indicating how certain you are in your assessment:
   - High confidence (0.8-1.0): Clear, unambiguous image with obvious condition
   - Medium confidence (0.5-0.8): Somewhat clear image but minor uncertainty
   - Low confidence (0.0-0.5): Unclear image, poor lighting, or ambiguous condition

Be thorough, professional, and specific in your commentary. Focus on factual observations that would be useful for property inspection documentation.

You must return a valid JSON object with the following structure:
{
  "condition": "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning",
  "commentary": "detailed commentary string",
  "confidence": 0.0-1.0
}`

    // Use Chat Completions API with vision (gpt-4o supports vision)
    // Use gpt-4o or gpt-4o-mini for vision, fallback to configured model if it supports vision
    const visionModel = MODEL_NAME.includes("gpt-4o") || MODEL_NAME.includes("gpt-5") ? MODEL_NAME : "gpt-4o"
    
    console.log(`[Inspection Image Analysis] Calling Chat Completions API with vision, model: ${visionModel}`)
    const response = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl
              }
            },
            {
              type: "text",
              text: "Analyze this inspection image and provide condition assessment, detailed commentary, and confidence score. Return the result as a JSON object matching the schema."
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for more consistent, factual analysis
    })

    console.log(`[Inspection Image Analysis] ✓ Analysis completed`)

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response content received from OpenAI")
    }

    // Parse the JSON response
    let parsed: any
    try {
      parsed = JSON.parse(content)
      console.log(`[Inspection Image Analysis] ✓ Successfully parsed JSON response`)
    } catch (parseError) {
      console.error(`[Inspection Image Analysis] ✗ Failed to parse JSON response:`, parseError)
      console.error(`[Inspection Image Analysis] Raw content:`, content)
      throw parseError
    }

    const result: InspectionImageAnalysisResult = {
      condition: parsed.condition as ItemCondition,
      commentary: parsed.commentary,
      confidence: parsed.confidence
    }

    // Validate result
    if (!result.condition || !result.commentary || typeof result.confidence !== "number") {
      throw new Error("Invalid analysis result structure")
    }

    // Validate condition is one of the allowed values
    const validConditions: ItemCondition[] = ["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"]
    if (!validConditions.includes(result.condition)) {
      throw new Error(`Invalid condition value: ${result.condition}`)
    }

    console.log(`[Inspection Image Analysis] ✓ Successfully analyzed image:`, {
      condition: result.condition,
      confidence: result.confidence
    })

    return result
  } catch (error) {
    console.error("[Inspection Image Analysis] Error analyzing image:", error)
    throw error
  }
}

/**
 * Analyze multiple inspection images together using OpenAI Chat Completions API with vision
 */
export async function analyzeInspectionImagesBatch(
  imageBuffers: Array<{ buffer: Buffer; fileName: string }>
): Promise<BatchInspectionImageAnalysisResult> {
  try {
    console.log(`[Inspection Image Analysis] Starting batch analysis for ${imageBuffers.length} images`)

    if (imageBuffers.length === 0) {
      throw new Error("No images provided for batch analysis")
    }

    const systemPrompt = `You are an expert property inspector analyzing multiple images of the same rental property item. Your task is to provide a comprehensive assessment by comparing all images together.

For the batch analysis, you must:
1. Compare all images to get a comprehensive view of the item
2. Provide an overall condition assessment considering all images:
   - "good": Item is in good condition across all images
   - "requires_repair": Item has damage or defects that need repair
   - "requires_cleaning": Item is dirty or needs cleaning but no repair needed
   - "requires_repair_and_cleaning": Item needs both repair and cleaning
3. Generate comprehensive overall commentary that:
   - Synthesizes observations from all images
   - Describes the complete condition of the item
   - Notes any differences or additional details seen in different images
   - Provides a professional, detailed assessment
4. Calculate overall confidence based on:
   - Agreement between images (higher if images show consistent condition)
   - Image quality and clarity
   - Completeness of views (multiple angles provide more confidence)
5. For each individual image, provide:
   - Condition assessment for that specific image (imageIndex: 0 for first image, 1 for second, etc.)
   - Commentary describing what is seen in that image
   - Confidence score for that image's assessment

The overall confidence should be higher when:
- Multiple images agree on the condition
- Images are clear and well-lit
- Images show different angles/views of the item
- There is consistency across all images

Be thorough, professional, and specific. Focus on factual observations useful for property inspection documentation.

You must return a valid JSON object with the following structure:
{
  "overallCondition": "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning",
  "overallCommentary": "comprehensive commentary string",
  "overallConfidence": 0.0-1.0,
  "imageAnalyses": [
    {
      "imageIndex": 0,
      "condition": "good" | "requires_repair" | "requires_cleaning" | "requires_repair_and_cleaning",
      "commentary": "commentary for this image",
      "confidence": 0.0-1.0
    },
    ...
  ]
}`

    // Convert all images to base64 data URLs
    const imageDataUrls = imageBuffers.map(img => imageBufferToBase64(img.buffer, img.fileName))

    // Build content array with all images
    const content: Array<{ type: "image_url"; image_url: { url: string } } | { type: "text"; text: string }> = []
    
    // Add all images
    imageDataUrls.forEach((dataUrl, index) => {
      content.push({
        type: "image_url",
        image_url: { url: dataUrl }
      })
    })
    
    // Add instruction text
    content.push({
      type: "text",
      text: `Analyze all ${imageBuffers.length} images together. Provide an overall assessment considering all images, plus individual analysis for each image. Image indices are 0-based (first image is index 0, second is index 1, etc.). Return the result as a JSON object matching the schema.`
    })

    // Use Chat Completions API with vision
    const visionModel = MODEL_NAME.includes("gpt-4o") || MODEL_NAME.includes("gpt-5") ? MODEL_NAME : "gpt-4o"
    
    console.log(`[Inspection Image Analysis] Calling Chat Completions API with ${imageBuffers.length} images, model: ${visionModel}`)
    const response = await openai.chat.completions.create({
      model: visionModel,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })

    console.log(`[Inspection Image Analysis] ✓ Batch analysis completed`)

    const outputText = response.choices[0]?.message?.content

    if (!outputText) {
      console.error(`[Inspection Image Analysis] ✗ No output text in Chat Completions response`)
      throw new Error("No output text received from OpenAI")
    }

    // Parse the JSON response
    let parsed: any
    try {
      parsed = JSON.parse(outputText)
      console.log(`[Inspection Image Analysis] ✓ Successfully parsed JSON response`)
    } catch (parseError) {
      console.error(`[Inspection Image Analysis] ✗ Failed to parse JSON response:`, parseError)
      console.error(`[Inspection Image Analysis] Raw output text:`, outputText)
      throw parseError
    }

    const result: BatchInspectionImageAnalysisResult = {
      overallCondition: parsed.overallCondition as ItemCondition,
      overallCommentary: parsed.overallCommentary,
      overallConfidence: parsed.overallConfidence,
      imageAnalyses: parsed.imageAnalyses.map((analysis: any) => ({
        imageIndex: analysis.imageIndex,
        condition: analysis.condition as ItemCondition,
        commentary: analysis.commentary,
        confidence: analysis.confidence
      }))
    }

    // Validate result
    if (!result.overallCondition || !result.overallCommentary || typeof result.overallConfidence !== "number") {
      throw new Error("Invalid batch analysis result structure")
    }

    if (!result.imageAnalyses || result.imageAnalyses.length !== imageBuffers.length) {
      throw new Error(`Expected ${imageBuffers.length} image analyses, got ${result.imageAnalyses?.length || 0}`)
    }

    // Validate all conditions
    const validConditions: ItemCondition[] = ["good", "requires_repair", "requires_cleaning", "requires_repair_and_cleaning"]
    if (!validConditions.includes(result.overallCondition)) {
      throw new Error(`Invalid overall condition value: ${result.overallCondition}`)
    }
    for (const analysis of result.imageAnalyses) {
      if (!validConditions.includes(analysis.condition)) {
        throw new Error(`Invalid condition value in image analysis: ${analysis.condition}`)
      }
    }

    console.log(`[Inspection Image Analysis] ✓ Successfully analyzed ${imageBuffers.length} images:`, {
      overallCondition: result.overallCondition,
      overallConfidence: result.overallConfidence
    })

    return result
  } catch (error) {
    console.error("[Inspection Image Analysis] Error analyzing images batch:", error)
    throw error
  }
}

