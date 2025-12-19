"use server"

import OpenAI from "openai"
import { downloadPDFFromSupabase } from "./storage/supabase-storage"
import { config } from "dotenv"
import { resolve } from "path"

// Explicitly load .env.local to ensure we get the correct API key
// This matches the behavior of the test scripts
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

// Debug: Log what API key is being used (first 10 chars only for security)
const apiKey = process.env.OPENAI_API_KEY
if (apiKey) {
  console.log(`[OpenAI] Using API key starting with: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`)
} else {
  console.error("[OpenAI] ERROR: OPENAI_API_KEY is not set in process.env")
}

const openai = new OpenAI({
  apiKey: apiKey
})

export interface TenantChargeableItem {
  type: "water" | "electricity" | "sewerage"
  usage?: number
  amount: number
  periodStart?: string
  periodEnd?: string
  readingDate?: string
}

export interface InvoiceExtractionData {
  tenantChargeableItems: TenantChargeableItem[]
  period?: string
  accountNumber?: string
}

export interface LandlordPayableItem {
  type: "levy" | "body_corporate" | "municipality" | "other"
  description: string
  amount: number
  beneficiaryName?: string
  beneficiaryAccountNumber?: string
  beneficiaryBankCode?: string
  reference?: string
  dueDate?: string
}

export interface PaymentExtractionData {
  landlordPayableItems: LandlordPayableItem[]
  totalAmount?: number
  period?: string
}

// JSON Schema for invoice generation (tenant-chargeable items)
const INVOICE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    tenantChargeableItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["water", "electricity", "sewerage"]
          },
          usage: {
            type: "number"
          },
          amount: {
            type: "number"
          },
          periodStart: {
            type: "string"
          },
          periodEnd: {
            type: "string"
          },
          readingDate: {
            type: "string"
          }
        },
        required: ["type", "amount"],
        additionalProperties: false
      }
    },
    period: {
      type: "string"
    },
    accountNumber: {
      type: "string"
    }
  },
  required: ["tenantChargeableItems", "period", "accountNumber"],
  additionalProperties: false
} as const

// JSON Schema for payment processing (landlord-payable items)
const PAYMENT_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    landlordPayableItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["levy", "body_corporate", "municipality", "other"]
          },
          description: {
            type: "string"
          },
          amount: {
            type: "number"
          },
          beneficiaryName: {
            type: "string"
          },
          beneficiaryAccountNumber: {
            type: "string"
          },
          beneficiaryBankCode: {
            type: "string"
          },
          reference: {
            type: "string"
          },
          dueDate: {
            type: "string"
          }
        },
        required: ["type", "description", "amount", "beneficiaryName", "beneficiaryAccountNumber", "beneficiaryBankCode", "reference", "dueDate"],
        additionalProperties: false
      }
    },
    totalAmount: {
      type: "number"
    },
    period: {
      type: "string"
    }
  },
  required: ["landlordPayableItems", "totalAmount", "period"],
  additionalProperties: false
} as const

/**
 * Upload PDF to OpenAI Files API
 */
async function uploadPDFToOpenAI(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }

    // Create a File-like object from Buffer
    // Convert Buffer to Uint8Array for File constructor compatibility
    const uint8Array = new Uint8Array(fileBuffer)
    const file = new File([uint8Array], fileName, { type: "application/pdf" })

    const fileResponse = await openai.files.create({
      file,
      purpose: "user_data"
    })

    return fileResponse.id
  } catch (error) {
    console.error("Error uploading PDF to OpenAI:", error)
    throw error
  }
}

/**
 * Extract data using OpenAI Responses API with Structured Outputs
 * Uses the Responses API as recommended by OpenAI for new projects
 */
async function extractWithStructuredOutputs(
  fileId: string,
  purpose: "invoice_generation" | "payment_processing",
  extractionConfig?: Record<string, unknown>,
  customInstruction?: string
): Promise<InvoiceExtractionData | PaymentExtractionData> {
  try {
    const schema =
      purpose === "invoice_generation" ? INVOICE_EXTRACTION_SCHEMA : PAYMENT_EXTRACTION_SCHEMA

    // Baseline (default) instructions per purpose
    const baselineInstructions =
      purpose === "invoice_generation"
        ? "You are an expert at extracting tenant-chargeable items from bills and invoices. Extract water usage/charges, electricity usage/charges, and sewerage charges that tenants should pay. Return structured data."
        : "You are an expert at extracting landlord-payable items from bills and invoices. Extract levies, body corporate fees, municipality charges, and other items that the landlord/rental agent should pay on behalf of the property. Include beneficiary details (name, account number, bank code) and payment references. Return structured data."

    // Use custom instruction if provided, otherwise use baseline
    const instructions = customInstruction || baselineInstructions

    const userText = extractionConfig
      ? `Extract data from this bill PDF using these extraction rules: ${JSON.stringify(extractionConfig, null, 2)}. Follow the extraction rules to identify and extract the relevant fields.`
      : "Extract all relevant data from this bill PDF."

    // Detailed logging so we can see exactly what is sent to OpenAI
    console.log("[PDF Extraction] ------------------------------")
    console.log("[PDF Extraction] Purpose:", purpose)
    console.log("[PDF Extraction] File ID:", fileId)
    console.log("[PDF Extraction] Baseline instructions:")
    console.log(baselineInstructions)
    if (customInstruction) {
      console.log("[PDF Extraction] Custom instructions override (from rule):")
      console.log(customInstruction)
    } else {
      console.log("[PDF Extraction] Custom instructions override: none (using baseline)")
    }
    console.log("[PDF Extraction] Final instructions sent to OpenAI:")
    console.log(instructions)
    console.log("[PDF Extraction] Extraction config (rules JSON):")
    if (extractionConfig) {
      console.log(JSON.stringify(extractionConfig, null, 2))
    } else {
      console.log("None (no extractionConfig provided)")
    }
    console.log("[PDF Extraction] User text sent to OpenAI:")
    console.log(userText)
    console.log("[PDF Extraction] JSON schema name:", purpose === "invoice_generation" ? "invoice_extraction" : "payment_extraction")
    console.log("[PDF Extraction] ------------------------------")

    // Use Responses API with structured outputs
    // Format: input can be a string or array of items (messages)
    // For file inputs, we use file_id in content array
    const response = await openai.responses.create({
      model: "gpt-5.2-2025-12-11", // or "gpt-4o-mini" for faster/cheaper
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
              text: userText
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: purpose === "invoice_generation" ? "invoice_extraction" : "payment_extraction",
          strict: true,
          schema: schema
        }
      }
    })

    // Extract the output text from the response
    // Responses API returns output as an array of items
    const outputText = response.output_text
    
    if (!outputText) {
      throw new Error("No output text in Responses API response")
    }

    // Parse the JSON response
    const parsed = JSON.parse(outputText)
    
    return parsed as InvoiceExtractionData | PaymentExtractionData
  } catch (error) {
    console.error(`Error extracting data for ${purpose} using Responses API:`, error)
    // Fallback to chat completions if Responses API fails
    console.log("Falling back to chat completions API...")
    return await extractWithChatCompletions(fileId, purpose, extractionConfig)
  }
}

/**
 * Fallback: Extract using chat completions API (if Responses API is unavailable)
 */
async function extractWithChatCompletions(
  fileId: string,
  purpose: "invoice_generation" | "payment_processing",
  extractionConfig?: Record<string, unknown>
): Promise<InvoiceExtractionData | PaymentExtractionData> {
  const schema =
    purpose === "invoice_generation" ? INVOICE_EXTRACTION_SCHEMA : PAYMENT_EXTRACTION_SCHEMA

  const systemPrompt =
    purpose === "invoice_generation"
      ? "You are an expert at extracting tenant-chargeable items from bills and invoices. Extract water usage/charges, electricity usage/charges, and sewerage charges that tenants should pay. Return structured data as JSON."
      : "You are an expert at extracting landlord-payable items from bills and invoices. Extract levies, body corporate fees, municipality charges, and other items that the landlord/rental agent should pay on behalf of the property. Include beneficiary details (name, account number, bank code) and payment references. Return structured data as JSON."

  const userPrompt = extractionConfig
    ? `Extract data from this bill PDF using these extraction rules: ${JSON.stringify(extractionConfig)}. Follow the extraction rules to identify and extract the relevant fields. Return the data as JSON matching this schema: ${JSON.stringify(schema)}.`
    : `Extract all relevant data from this bill PDF. Return the data as JSON matching this schema: ${JSON.stringify(schema)}.`

  // Note: Chat completions API doesn't directly support PDF files
  // We'll need to use the Assistants API or convert PDF to text first
  // For now, return empty structure - this will be handled by the processing pipeline
  // which should download and process the PDF differently
  
  // Return empty structure as fallback
  if (purpose === "invoice_generation") {
    return { tenantChargeableItems: [] }
  } else {
    return { landlordPayableItems: [] }
  }
}

/**
 * Process PDF with dual-purpose extraction using OpenAI Files + Responses API
 */
export async function processPDFWithDualPurposeExtraction(
  fileUrl: string,
  invoiceRule?: { 
    id: string
    extractionConfig?: Record<string, unknown>
    instruction?: string
  },
  paymentRule?: { 
    id: string
    extractionConfig?: Record<string, unknown>
    instruction?: string
  }
): Promise<{
  invoiceData: InvoiceExtractionData | null
  paymentData: PaymentExtractionData | null
}> {
  try {
    console.log("[PDF Extraction] Starting dual-purpose extraction for file:", fileUrl)
    console.log("[PDF Extraction] Invoice rule present:", !!invoiceRule, "Rule ID:", invoiceRule?.id)
    console.log("[PDF Extraction] Payment rule present:", !!paymentRule, "Rule ID:", paymentRule?.id)

    // Download PDF from Supabase
    const fileBuffer = await downloadPDFFromSupabase(fileUrl)
    const fileName = fileUrl.split("/").pop() || "bill.pdf"

    // Upload PDF to OpenAI Files API
    const fileId = await uploadPDFToOpenAI(fileBuffer, fileName)

    let invoiceData: InvoiceExtractionData | null = null
    let paymentData: PaymentExtractionData | null = null

    // Extract for invoice generation if rule exists
    if (invoiceRule) {
      console.log("[PDF Extraction] Running invoice extraction using rule:", invoiceRule.id)
      try {
        const extracted = await extractWithStructuredOutputs(
          fileId,
          "invoice_generation",
          invoiceRule.extractionConfig,
          invoiceRule.instruction
        )
        invoiceData = extracted as InvoiceExtractionData
      } catch (error) {
        console.error("Failed to extract invoice data:", error)
        // Continue with payment extraction even if invoice extraction fails
      }
    }

    // Extract for payment processing if rule exists
    if (paymentRule) {
      console.log("[PDF Extraction] Running payment extraction using rule:", paymentRule.id)
      try {
        const extracted = await extractWithStructuredOutputs(
          fileId,
          "payment_processing",
          paymentRule.extractionConfig,
          paymentRule.instruction
        )
        paymentData = extracted as PaymentExtractionData
      } catch (error) {
        console.error("Failed to extract payment data:", error)
        // Continue even if payment extraction fails
      }
    }

    // Clean up: delete file from OpenAI (optional, but good practice)
    try {
      await openai.files.delete(fileId)
    } catch (error) {
      console.warn("Failed to delete OpenAI file:", error)
      // Non-critical error, continue
    }

    return { invoiceData, paymentData }
  } catch (error) {
    console.error("Error processing PDF with dual-purpose extraction:", error)
    throw error
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use processPDFWithDualPurposeExtraction instead
 */
export async function processPDFWithOpenAI(
  fileUrl: string,
  rawText: string,
  extractionConfig?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // For backward compatibility, we'll use the new dual-purpose extraction
  // but return a flat structure
  try {
    const fileBuffer = await downloadPDFFromSupabase(fileUrl)
    const fileName = fileUrl.split("/").pop() || "bill.pdf"
    const fileId = await uploadPDFToOpenAI(fileBuffer, fileName)

    const extracted = await extractWithStructuredOutputs(
      fileId,
      "invoice_generation",
      extractionConfig
    )

    // Convert to flat structure for backward compatibility
    const flat: Record<string, unknown> = {}
    if ("tenantChargeableItems" in extracted) {
      const items = extracted.tenantChargeableItems
      for (const item of items) {
        if (item.type === "water") {
          flat.waterUsage = item.usage
          flat.waterAmount = item.amount
        } else if (item.type === "electricity") {
          flat.electricityUsage = item.usage
          flat.electricityAmount = item.amount
        }
      }
    }

    return flat
  } catch (error) {
    console.error("Error in legacy processPDFWithOpenAI:", error)
    throw error
  }
}

/**
 * Legacy function - no longer needed with OpenAI Files API
 * @deprecated PDFs are processed directly via OpenAI Files API
 */
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  // This function is no longer needed since OpenAI Files API processes PDFs directly
  // Return empty string for backward compatibility
  return ""
}
