import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export type DocumentType = "invoice" | "statement" | "other"

export interface DocumentClassification {
  type: DocumentType
  confidence: number
  reason?: string
}

/**
 * Classify a document attachment (invoice vs statement vs other)
 */
export async function classifyDocument(
  fileName: string,
  contentType?: string
): Promise<DocumentClassification> {
  console.log(`[Document Classifier] Classifying document: ${fileName}`)

  // Quick checks based on filename
  const lowerFileName = fileName.toLowerCase()

  if (lowerFileName.includes("invoice") || lowerFileName.includes("inv")) {
    return {
      type: "invoice",
      confidence: 0.8,
      reason: "Filename contains 'invoice'"
    }
  }

  if (
    lowerFileName.includes("statement") ||
    lowerFileName.includes("stmt") ||
    lowerFileName.includes("bill")
  ) {
    return {
      type: "statement",
      confidence: 0.8,
      reason: "Filename contains 'statement' or 'bill'"
    }
  }

  // Use AI for more complex classification if needed
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are classifying documents. Classify as 'invoice' (bill sent to customer), 'statement' (account summary), or 'other'. Return JSON with type and confidence."
        },
        {
          role: "user",
          content: `Classify this document based on filename: ${fileName}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      const result = JSON.parse(content) as {
        type?: DocumentType
        confidence?: number
        reason?: string
      }
      if (result.type && ["invoice", "statement", "other"].includes(result.type)) {
        return {
          type: result.type,
          confidence: result.confidence || 0.7,
          reason: result.reason
        }
      }
    }
  } catch (error) {
    console.warn("[Document Classifier] AI classification failed, using default:", error)
  }

  // Default to statement if uncertain
  return {
    type: "statement",
    confidence: 0.5,
    reason: "Unable to determine type, defaulting to statement"
  }
}

