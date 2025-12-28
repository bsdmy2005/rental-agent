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
  console.error("[Expense Extraction] ERROR: OPENAI_API_KEY is not set in process.env")
}

const openai = new OpenAI({
  apiKey: apiKey
})

export interface ExpenseExtractionData {
  amount: number
  date: string // ISO format YYYY-MM-DD
  merchantName?: string | null
  description: string
  category?: string | null // Suggested category based on merchant/description
  taxAmount?: number | null
  paymentMethod?: string | null
  referenceNumber?: string | null
  items?: Array<{
    description: string
    amount: number
  }> | null
}

// JSON Schema for expense extraction
// Note: With strict: true, OpenAI requires all properties to be in required array
// Optional fields are made nullable and included in required to satisfy strict mode
const EXPENSE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    amount: {
      type: "number",
      description: "Total expense amount in currency (e.g., RAND for South Africa)"
    },
    date: {
      type: "string",
      description: "Expense date in ISO format (YYYY-MM-DD). Extract from receipt/invoice date."
    },
    merchantName: {
      type: ["string", "null"],
      description: "Merchant/vendor/store name. Can be null if not found."
    },
    description: {
      type: "string",
      description: "Description of the expense based on receipt/invoice content. Should be detailed and descriptive."
    },
    category: {
      type: ["string", "null"],
      enum: [
        "maintenance",
        "repairs",
        "insurance",
        "property_management_fees",
        "municipal_rates_taxes",
        "interest_mortgage_bonds",
        "advertising",
        "legal_fees",
        "cleaning",
        "gardening",
        "utilities",
        "other",
        null
      ],
      description: "Suggested expense category based on merchant name and description. Use 'other' if uncertain."
    },
    taxAmount: {
      type: ["number", "null"],
      description: "Tax/VAT amount if shown separately. Can be null if not found."
    },
    paymentMethod: {
      type: ["string", "null"],
      enum: ["cash", "bank_transfer", "credit_card", "debit_card", "other", null],
      description: "Payment method if visible on receipt. Can be null if not found."
    },
    referenceNumber: {
      type: ["string", "null"],
      description: "Receipt/invoice number or reference. Can be null if not found."
    },
    items: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Item description"
          },
          amount: {
            type: "number",
            description: "Item amount"
          }
        },
        required: ["description", "amount"],
        additionalProperties: false
      },
      description: "Line items from receipt if available. Can be null if not itemized."
    }
  },
  required: ["amount", "date", "description", "merchantName", "category", "taxAmount", "paymentMethod", "referenceNumber", "items"],
  additionalProperties: false
  // merchantName, category, taxAmount, paymentMethod, referenceNumber, items are nullable (optional but must be present as null)
} as const

/**
 * Upload image or PDF to OpenAI Files API
 * Uses the same pattern as pdf-processing.ts with "user_data" purpose
 */
async function uploadFileToOpenAI(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
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
      const pdfMagicBytes = fileBuffer.slice(0, 4).toString("ascii")
      if (pdfMagicBytes !== "%PDF") {
        throw new Error(`File is not a valid PDF. Magic bytes: ${pdfMagicBytes}`)
      }
    }

    // Ensure filename has correct extension
    let finalFileName = fileName
    if (isPDF && !finalFileName.toLowerCase().endsWith(".pdf")) {
      const nameWithoutExt = finalFileName.split(".").slice(0, -1).join(".") || finalFileName
      finalFileName = `${nameWithoutExt}.pdf`
      console.log(`[Expense Extraction] ⚠ Filename missing .pdf extension, renamed: ${fileName} → ${finalFileName}`)
    }

    console.log(`[Expense Extraction] Uploading file to OpenAI: ${finalFileName} (${fileBuffer.length} bytes)`)

    // Convert Buffer to Uint8Array for File constructor (same approach as pdf-processing.ts)
    const uint8Array = new Uint8Array(fileBuffer)
    const file = new File([uint8Array], finalFileName, {
      type: isPDF ? "application/pdf" : "image/jpeg"
    })

    const fileResponse = await openai.files.create({
      file,
      purpose: "user_data" // Use same purpose as PDF processing
    })

    console.log(`[Expense Extraction] ✓ File uploaded successfully. File ID: ${fileResponse.id}`)

    // Wait for file to be processed (OpenAI needs to process the file before it can be used)
    let fileStatus: string = fileResponse.status
    let attempts = 0
    const maxAttempts = 60 // Wait up to 60 seconds

    console.log(`[Expense Extraction] Initial file status: ${fileStatus}`)

    while ((fileStatus === "uploaded" || fileStatus === "pending") && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds between checks
      try {
        const fileInfo = await openai.files.retrieve(fileResponse.id)
        fileStatus = fileInfo.status
        attempts++

        console.log(`[Expense Extraction] File status check ${attempts}/${maxAttempts}: ${fileStatus}`)

        if (fileStatus === "processed") {
          console.log(`[Expense Extraction] ✓ File processed by OpenAI (attempt ${attempts}, ${attempts * 2}s)`)
          break
        } else if (fileStatus === "error") {
          const errorDetails = await openai.files.retrieve(fileResponse.id)
          throw new Error(`File processing failed: ${JSON.stringify(errorDetails)}`)
        }
      } catch (checkError) {
        console.error(`[Expense Extraction] Error checking file status:`, checkError)
        // Continue waiting if it's a transient error
        if (attempts >= maxAttempts - 1) {
          throw checkError
        }
      }
    }

    if (fileStatus !== "processed") {
      const errorMsg = `File not fully processed after ${attempts * 2}s (status: ${fileStatus}). This may cause extraction to fail.`
      console.error(`[Expense Extraction] ✗ ${errorMsg}`)
      // Still return the file ID - let the extraction attempt fail with a clearer error
    }

    return fileResponse.id
  } catch (error) {
    console.error("[Expense Extraction] ✗ Error uploading file to OpenAI:", error)
    if (error instanceof Error) {
      console.error("[Expense Extraction]   Error message:", error.message)
    }
    throw error
  }
}

/**
 * Extract expense data from receipt/invoice image or PDF using OpenAI Responses API
 * Uses the same pattern as pdf-processing.ts
 */
export async function extractExpenseFromReceipt(
  fileBuffer: Buffer,
  fileName: string
): Promise<ExpenseExtractionData> {
  try {
    console.log(`[Expense Extraction] Starting extraction for: ${fileName}`)

    // Upload file to OpenAI
    const fileId = await uploadFileToOpenAI(fileBuffer, fileName)

    // Extract data using Responses API with structured outputs (same pattern as pdf-processing.ts)
    const instructions = `You are an expert at extracting expense information from receipts and invoices. 

Extract the following information:
- Total amount (look for "Total", "Amount Due", "Total Payable", etc.)
- Date (receipt date, invoice date, transaction date - convert to YYYY-MM-DD format)
- Merchant/Vendor name (store name, business name)
- Description (what was purchased/service provided - be detailed)
- Category (classify based on merchant and description - use South African property expense categories)
- Tax/VAT amount (if shown separately)
- Payment method (if visible: cash, card, bank transfer, etc.)
- Reference number (receipt number, invoice number, transaction ID)
- Line items (if itemized, extract individual items with descriptions and amounts)

For category classification, consider:
- Hardware stores, building supplies → "maintenance" or "repairs"
- Insurance companies → "insurance"
- Property management companies → "property_management_fees"
- Municipalities, councils → "municipal_rates_taxes"
- Banks, financial institutions → "interest_mortgage_bonds"
- Marketing agencies, advertising → "advertising"
- Law firms, attorneys → "legal_fees"
- Cleaning services → "cleaning"
- Garden centers, landscaping → "gardening"
- Utility companies → "utilities"
- Everything else → "other"

Be accurate and thorough. If information is not clearly visible, use null for optional fields.`

    // CRITICAL: Verify file details before using in Responses API (same pattern as pdf-processing.ts)
    try {
      const fileDetails = await openai.files.retrieve(fileId)
      console.log(`[Expense Extraction] ⚠ File details before Responses API call:`, {
        id: fileDetails.id,
        filename: fileDetails.filename,
        status: fileDetails.status,
        bytes: fileDetails.bytes
      })
      if (fileName.toLowerCase().endsWith(".pdf") && !fileDetails.filename?.toLowerCase().endsWith(".pdf")) {
        console.error(`[Expense Extraction] ✗ CRITICAL: File "${fileDetails.filename}" missing .pdf extension - this may cause errors!`)
      }
    } catch (verifyError) {
      console.warn(`[Expense Extraction] ⚠ Could not verify file details:`, verifyError)
    }

    // Use Responses API with structured outputs (same pattern as pdf-processing.ts)
    console.log(`[Expense Extraction] Calling Responses API with file_id: ${fileId}`)
    const response = await openai.responses.create({
      model: "gpt-5.2-2025-12-11",
      instructions: instructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              file_id: fileId
            },
            {
              type: "input_text",
              text: "Extract all expense information from this receipt/invoice. Return structured data."
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "expense_extraction",
          strict: true,
          schema: EXPENSE_EXTRACTION_SCHEMA
        }
      }
    })

    console.log(`[Expense Extraction] ✓ Extraction completed. Response ID: ${response.id}`)

    const outputText = response.output_text

    if (!outputText) {
      console.error(`[Expense Extraction] ✗ No output text in Responses API response`)
      console.error(`[Expense Extraction] Full response object:`, JSON.stringify(response, null, 2))
      throw new Error("No output text received from OpenAI")
    }

    console.log(`[Expense Extraction] Output text length: ${outputText.length} characters`)
    console.log(`[Expense Extraction] Output text preview: ${outputText.substring(0, 200)}...`)

    // Parse the JSON response
    let parsed: any
    try {
      parsed = JSON.parse(outputText)
      console.log(`[Expense Extraction] ✓ Successfully parsed JSON response`)
    } catch (parseError) {
      console.error(`[Expense Extraction] ✗ Failed to parse JSON response:`, parseError)
      console.error(`[Expense Extraction] Raw output text:`, outputText)
      throw parseError
    }

    // Convert null values to undefined for optional fields (to match TypeScript types)
    // This is needed because OpenAI strict mode requires all properties to be in required array
    // but we make optional fields nullable, then convert null to undefined here
    const extractedData: ExpenseExtractionData = {
      amount: parsed.amount,
      date: parsed.date,
      description: parsed.description,
      merchantName: parsed.merchantName === null ? undefined : parsed.merchantName,
      category: parsed.category === null ? undefined : parsed.category,
      taxAmount: parsed.taxAmount === null ? undefined : parsed.taxAmount,
      paymentMethod: parsed.paymentMethod === null ? undefined : parsed.paymentMethod,
      referenceNumber: parsed.referenceNumber === null ? undefined : parsed.referenceNumber,
      items: parsed.items === null ? undefined : parsed.items
    }

    // Validate required fields
    if (!extractedData.amount || !extractedData.date || !extractedData.description) {
      throw new Error("Missing required fields in extraction result")
    }

    console.log(`[Expense Extraction] ✓ Successfully extracted expense data:`, {
      amount: extractedData.amount,
      date: extractedData.date,
      merchant: extractedData.merchantName,
      category: extractedData.category
    })

    return extractedData
  } catch (error) {
    console.error("[Expense Extraction] Error extracting expense data:", error)
    throw error
  }
}

