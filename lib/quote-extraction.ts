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
  console.error("[Quote Extraction] ERROR: OPENAI_API_KEY is not set in process.env")
}

const openai = new OpenAI({
  apiKey: apiKey
})

export interface QuoteExtractionData {
  amount: string // Keep as string to preserve currency formatting
  description: string
  estimatedCompletionDate?: string | null // ISO date format YYYY-MM-DD
  currency?: string | null // Default: "ZAR"
  includesVAT?: boolean | null
  breakdown?: Array<{
    item: string
    amount: string
  }> | null
}

// JSON Schema for quote extraction
// Note: With strict: true, OpenAI requires all properties to be in required array
const QUOTE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    amount: {
      type: "string",
      description: "Total quote amount as a string (e.g., 'R 1,500.00' or '1500'). Preserve currency symbols and formatting."
    },
    description: {
      type: "string",
      description: "Detailed description of work to be performed or services quoted. Should be comprehensive and clear."
    },
    estimatedCompletionDate: {
      type: ["string", "null"],
      description: "Estimated completion date in ISO format (YYYY-MM-DD). Extract from text like 'complete by', 'finish on', 'ready by', etc. Can be null if not found."
    },
    currency: {
      type: ["string", "null"],
      description: "Currency code (e.g., 'ZAR', 'USD', 'EUR'). Default to 'ZAR' for South African quotes. Can be null if not specified."
    },
    includesVAT: {
      type: ["boolean", "null"],
      description: "Whether VAT is included in the quote amount. Can be null if not specified."
    },
    breakdown: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          item: {
            type: "string",
            description: "Item or service description"
          },
          amount: {
            type: "string",
            description: "Item amount as string"
          }
        },
        required: ["item", "amount"],
        additionalProperties: false
      },
      description: "Line item breakdown if available. Can be null if quote is not itemized."
    }
  },
  required: ["amount", "description", "estimatedCompletionDate", "currency", "includesVAT", "breakdown"],
  additionalProperties: false
} as const

/**
 * Upload image or PDF to OpenAI Files API
 * Uses the same pattern as expense-extraction.ts with "user_data" purpose
 */
async function uploadFileToOpenAI(fileBuffer: Buffer | Array<number> | Uint8Array | unknown, fileName: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    // Ensure fileBuffer is a proper Buffer (it might be serialized when passed through server actions)
    let buffer: Buffer
    if (Buffer.isBuffer(fileBuffer)) {
      buffer = fileBuffer
    } else if (Array.isArray(fileBuffer)) {
      // If it was serialized as an array, convert back to Buffer
      buffer = Buffer.from(fileBuffer)
    } else if (fileBuffer instanceof Uint8Array) {
      buffer = Buffer.from(fileBuffer)
    } else {
      // Try to convert from any object that might have data
      buffer = Buffer.from(fileBuffer as any)
    }

    // Validate file buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("File buffer is empty")
    }

    // Determine file type
    const isPDF = fileName.toLowerCase().endsWith(".pdf")
    const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)

    if (!isPDF && !isImage) {
      throw new Error(`Unsupported file type. Only images (JPG, PNG, GIF, WEBP) and PDFs are supported.`)
    }

    // For PDFs, validate magic bytes
    if (isPDF) {
      const pdfMagicBytes = buffer.slice(0, 4).toString("ascii")
      if (pdfMagicBytes !== "%PDF") {
        throw new Error(`File is not a valid PDF. Magic bytes: ${pdfMagicBytes}`)
      }
    }

    // Ensure filename has correct extension
    let finalFileName = fileName
    if (isPDF && !finalFileName.toLowerCase().endsWith(".pdf")) {
      const nameWithoutExt = finalFileName.split(".").slice(0, -1).join(".") || finalFileName
      finalFileName = `${nameWithoutExt}.pdf`
      console.log(`[Quote Extraction] ⚠ Filename missing .pdf extension, renamed: ${fileName} → ${finalFileName}`)
    }

    console.log(`[Quote Extraction] Uploading file to OpenAI: ${finalFileName} (${buffer.length} bytes)`)

    // Convert Buffer to Uint8Array for File constructor
    const uint8Array = new Uint8Array(buffer)
    const file = new File([uint8Array], finalFileName, {
      type: isPDF ? "application/pdf" : "image/jpeg"
    })

    const fileResponse = await openai.files.create({
      file,
      purpose: "user_data"
    })

    console.log(`[Quote Extraction] ✓ File uploaded successfully. File ID: ${fileResponse.id}`)

    // Wait for file to be processed
    let fileStatus: string = fileResponse.status
    let attempts = 0
    const maxAttempts = 60 // Wait up to 60 seconds

    console.log(`[Quote Extraction] Initial file status: ${fileStatus}`)

    while ((fileStatus === "uploaded" || fileStatus === "pending") && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds between checks
      try {
        const fileInfo = await openai.files.retrieve(fileResponse.id)
        fileStatus = fileInfo.status
        attempts++

        console.log(`[Quote Extraction] File status check ${attempts}/${maxAttempts}: ${fileStatus}`)

        if (fileStatus === "processed") {
          console.log(`[Quote Extraction] ✓ File processed by OpenAI (attempt ${attempts}, ${attempts * 2}s)`)
          break
        } else if (fileStatus === "error") {
          const errorDetails = await openai.files.retrieve(fileResponse.id)
          throw new Error(`File processing failed: ${JSON.stringify(errorDetails)}`)
        }
      } catch (checkError) {
        console.error(`[Quote Extraction] Error checking file status:`, checkError)
        if (attempts >= maxAttempts - 1) {
          throw checkError
        }
      }
    }

    if (fileStatus !== "processed") {
      const errorMsg = `File not fully processed after ${attempts * 2}s (status: ${fileStatus}). This may cause extraction to fail.`
      console.error(`[Quote Extraction] ✗ ${errorMsg}`)
    }

    return fileResponse.id
  } catch (error) {
    console.error("[Quote Extraction] ✗ Error uploading file to OpenAI:", error)
    if (error instanceof Error) {
      console.error("[Quote Extraction]   Error message:", error.message)
    }
    throw error
  }
}

/**
 * Unified extraction function using OpenAI Responses API
 * Processes text content and/or file attachments together
 */
async function extractQuoteWithResponsesAPI(
  textContent?: string,
  fileIds?: string[]
): Promise<QuoteExtractionData> {
  try {
    const instructions = `You are an expert at extracting quote information from text messages, emails, PDF documents, or images.

Extract the following information:
- Total quote amount (look for "R", "ZAR", amounts with currency symbols, "Total", "Quote", etc.)
- Description of work/services to be performed (be detailed and comprehensive)
- Estimated completion date (look for phrases like "complete by", "finish on", "ready by", "in X days/weeks", dates)
- Currency (default to "ZAR" for South African quotes if not specified)
- Whether VAT is included (look for "incl VAT", "excl VAT", "VAT included", etc.)
- Line item breakdown (if the quote is itemized, extract each item with its amount)

For dates, convert relative dates like "in 2 weeks" or "by next Friday" to actual ISO dates (YYYY-MM-DD).
If no date is found, set estimatedCompletionDate to null.

For amounts, preserve the original formatting as a string (e.g., "R 1,500.00" or "1500").

If both text content and file attachments are provided, use all available information to extract the most complete quote data.`

    // Build content array with text and/or files
    const content: Array<
      | { type: "input_text"; text: string }
      | { type: "input_file"; file_id: string }
    > = []

    if (textContent) {
      content.push({ type: "input_text", text: textContent })
    }

    if (fileIds && fileIds.length > 0) {
      for (const fileId of fileIds) {
        content.push({ type: "input_file", file_id: fileId })
      }
    }

    if (content.length === 0) {
      throw new Error("No content provided for extraction")
    }

    console.log(`[Quote Extraction] Calling Responses API with ${content.length} content item(s)`)

    const response = await openai.responses.create({
      model: "gpt-5.2-2025-12-11",
      instructions: instructions,
      input: [
        {
          role: "user",
          content: content
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "quote_extraction",
          strict: true,
          schema: QUOTE_EXTRACTION_SCHEMA
        }
      }
    })

    // Extract the output text from the response
    const outputText = response.output_text

    if (!outputText) {
      console.error(`[Quote Extraction] ✗ No output text in Responses API response`)
      console.error(`[Quote Extraction] Full response object:`, JSON.stringify(response, null, 2))
      throw new Error("No output text in Responses API response")
    }

    // Parse the JSON output
    const extractedData = JSON.parse(outputText) as QuoteExtractionData

    if (!extractedData) {
      throw new Error("Failed to extract quote data from response")
    }

    // Clean up null values to undefined for optional fields
    const cleaned: QuoteExtractionData = {
      amount: extractedData.amount,
      description: extractedData.description,
      estimatedCompletionDate: extractedData.estimatedCompletionDate || undefined,
      currency: extractedData.currency || "ZAR",
      includesVAT: extractedData.includesVAT ?? undefined,
      breakdown: extractedData.breakdown || undefined
    }

    console.log(`[Quote Extraction] ✓ Extraction completed successfully`)
    return cleaned
  } catch (error) {
    console.error("[Quote Extraction] ✗ Error extracting quote with Responses API:", error)
    throw error
  }
}

/**
 * Extract quote data from text using OpenAI Responses API
 */
export async function extractQuoteFromText(text: string): Promise<QuoteExtractionData> {
  try {
    console.log(`[Quote Extraction] Starting text extraction`)
    return await extractQuoteWithResponsesAPI(text, undefined)
  } catch (error) {
    console.error("[Quote Extraction] ✗ Error extracting quote from text:", error)
    throw error
  }
}

/**
 * Extract quote data from PDF using OpenAI Files API + Responses API
 */
export async function extractQuoteFromPDF(pdfBuffer: Buffer, fileName: string): Promise<QuoteExtractionData> {
  try {
    console.log(`[Quote Extraction] Starting PDF extraction for: ${fileName}`)

    // Upload file to OpenAI
    const fileId = await uploadFileToOpenAI(pdfBuffer, fileName)

    // Use unified extraction function with file only
    return await extractQuoteWithResponsesAPI(undefined, [fileId])
  } catch (error) {
    console.error("[Quote Extraction] ✗ Error extracting quote from PDF:", error)
    throw error
  }
}

/**
 * Extract quote data from email payload (body and attachments)
 * Processes email body and attachments together for better extraction
 */
export async function extractQuoteFromEmail(
  emailBody: string,
  attachments?: Array<{ fileName: string; content: Buffer }>
): Promise<QuoteExtractionData> {
  try {
    console.log(`[Quote Extraction] Starting email extraction`)
    console.log(`[Quote Extraction] Email body length: ${emailBody.length} chars`)
    console.log(`[Quote Extraction] Attachments: ${attachments?.length || 0}`)

    // Upload all attachments to OpenAI if present
    const fileIds: string[] = []
    if (attachments && attachments.length > 0) {
      console.log(`[Quote Extraction] Uploading ${attachments.length} attachment(s) to OpenAI`)
      for (const attachment of attachments) {
        try {
          const fileId = await uploadFileToOpenAI(attachment.content, attachment.fileName)
          fileIds.push(fileId)
          console.log(`[Quote Extraction] ✓ Uploaded: ${attachment.fileName} (file_id: ${fileId})`)
        } catch (uploadError) {
          console.warn(`[Quote Extraction] ⚠ Failed to upload ${attachment.fileName}:`, uploadError)
          // Continue with other attachments
        }
      }
    }

    // Process email body and attachments together using unified extraction
    // This ensures we get the best extraction by combining all available information
    const extractedData = await extractQuoteWithResponsesAPI(
      emailBody || undefined,
      fileIds.length > 0 ? fileIds : undefined
    )

    console.log(`[Quote Extraction] ✓ Email extraction completed successfully`)
    return extractedData
  } catch (error) {
    console.error("[Quote Extraction] ✗ Error extracting quote from email:", error)
    throw error
  }
}

