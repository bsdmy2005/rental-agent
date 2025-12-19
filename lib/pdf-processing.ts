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
  usage?: number | null // Nullable to match OpenAI strict mode schema
  amount: number
  periodStart?: string | null // Nullable to match OpenAI strict mode schema
  periodEnd?: string | null // Nullable to match OpenAI strict mode schema
  readingDate?: string | null // Nullable to match OpenAI strict mode schema
}

export interface InvoiceExtractionData {
  tenantChargeableItems: TenantChargeableItem[]
  period?: string | null // Nullable to match OpenAI strict mode schema
  accountNumber?: string | null // Nullable to match OpenAI strict mode schema
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
// Note: With strict: true, OpenAI requires all properties to be in required array
// Optional fields are made nullable and included in required to satisfy strict mode
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
            type: ["number", "null"],
            description: "Usage amount (optional, e.g., kiloliters for water, kWh for electricity). Can be null if not available."
          },
          amount: {
            type: "number",
            description: "Charge amount in currency"
          },
          periodStart: {
            type: ["string", "null"],
            description: "Period start date (optional, ISO format). Can be null if not available."
          },
          periodEnd: {
            type: ["string", "null"],
            description: "Period end date (optional, ISO format). Can be null if not available."
          },
          readingDate: {
            type: ["string", "null"],
            description: "Reading date (optional, ISO format). Can be null if not available."
          }
        },
        required: ["type", "amount", "usage", "periodStart", "periodEnd", "readingDate"],
        additionalProperties: false
        // usage, periodStart, periodEnd, readingDate are nullable (optional but must be present as null)
      }
    },
    period: {
      type: ["string", "null"],
      description: "Billing period (REQUIRED - must be extracted if available in the document, e.g., 'January 2025', '2025-01', '01/2025'). This is a single period that applies to ALL tenant-chargeable items. Look for period information in document headers, footers, or summary sections. Can be null only if absolutely not found in the document."
    },
    accountNumber: {
      type: ["string", "null"],
      description: "Account number (optional). Can be null if not available."
    }
  },
  required: ["tenantChargeableItems", "period", "accountNumber"],
  additionalProperties: false
  // period and accountNumber are nullable (optional but must be present as null)
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
      type: "string",
      description: "Billing period (REQUIRED - must be extracted if available in the document, e.g., 'January 2025', '2025-01', '01/2025'). This is a single period that applies to ALL landlord-payable items. Look for period information in document headers, footers, or summary sections."
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

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("File buffer is empty")
    }

    // Validate PDF magic bytes
    const pdfMagicBytes = fileBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      throw new Error(`File is not a valid PDF. Magic bytes: ${pdfMagicBytes}`)
    }

    // Ensure filename has .pdf extension (required by OpenAI for file type detection)
    let finalFileName = fileName
    if (!finalFileName.toLowerCase().endsWith(".pdf")) {
      // Remove any existing extension and add .pdf
      const nameWithoutExt = finalFileName.split(".").slice(0, -1).join(".") || finalFileName
      finalFileName = `${nameWithoutExt}.pdf`
      console.log(`[PDF Upload] ⚠ Filename missing .pdf extension, renamed: ${fileName} → ${finalFileName}`)
    }

    console.log(`[PDF Upload] Uploading PDF to OpenAI: ${finalFileName} (${fileBuffer.length} bytes)`)

    // Create a File-like object from Buffer
    // Convert Buffer to Uint8Array for File constructor compatibility
    const uint8Array = new Uint8Array(fileBuffer)
    const file = new File([uint8Array], finalFileName, { type: "application/pdf" })

    const fileResponse = await openai.files.create({
      file,
      purpose: "user_data"
    })

    console.log(`[PDF Upload] ✓ File uploaded successfully. File ID: ${fileResponse.id}`)
    console.log(`[PDF Upload] Uploaded filename: ${finalFileName}`)
    console.log(`[PDF Upload] File object name: ${file.name}`)
    console.log(`[PDF Upload] File object type: ${file.type}`)

    // Wait for file to be processed (OpenAI needs to process the file before it can be used)
    let fileStatus = fileResponse.status
    let attempts = 0
    const maxAttempts = 60 // Wait up to 60 seconds (PDFs can take longer to process)

    console.log(`[PDF Upload] Initial file status: ${fileStatus}`)

    while ((fileStatus === "uploaded" || fileStatus === "pending") && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between checks
      try {
        const fileInfo = await openai.files.retrieve(fileResponse.id)
        fileStatus = fileInfo.status
        attempts++
        
        console.log(`[PDF Upload] File status check ${attempts}/${maxAttempts}: ${fileStatus}`)
        
        if (fileStatus === "processed") {
          console.log(`[PDF Upload] ✓ File processed by OpenAI (attempt ${attempts}, ${attempts * 2}s)`)
          // Verify file details - CRITICAL: Check what OpenAI actually sees
          const fileDetails = await openai.files.retrieve(fileResponse.id)
          console.log(`[PDF Upload] ⚠ CRITICAL FILE DETAILS (what OpenAI sees):`, {
            id: fileDetails.id,
            bytes: fileDetails.bytes,
            filename: fileDetails.filename,
            purpose: fileDetails.purpose,
            status: fileDetails.status
          })
          
          // Check if filename has .pdf extension
          if (!fileDetails.filename?.toLowerCase().endsWith(".pdf")) {
            console.error(`[PDF Upload] ✗ CRITICAL: OpenAI stored filename "${fileDetails.filename}" does NOT have .pdf extension!`)
            console.error(`[PDF Upload]   This will cause "got none" error in Responses API`)
            console.error(`[PDF Upload]   Original filename we sent: ${finalFileName}`)
          } else {
            console.log(`[PDF Upload] ✓ Filename has .pdf extension: ${fileDetails.filename}`)
          }
          
          // CRITICAL: Verify file bytes match what we uploaded
          if (fileDetails.bytes !== fileBuffer.length) {
            console.error(`[PDF Upload] ✗ CRITICAL: File size mismatch!`)
            console.error(`[PDF Upload]   Uploaded: ${fileBuffer.length} bytes`)
            console.error(`[PDF Upload]   Stored: ${fileDetails.bytes} bytes`)
            console.error(`[PDF Upload]   This may indicate file corruption or incomplete upload`)
          } else {
            console.log(`[PDF Upload] ✓ File size matches: ${fileDetails.bytes} bytes`)
          }
          
          break
        } else if (fileStatus === "error") {
          const errorDetails = await openai.files.retrieve(fileResponse.id)
          throw new Error(`File processing failed: ${JSON.stringify(errorDetails)}`)
        }
      } catch (checkError) {
        console.error(`[PDF Upload] Error checking file status:`, checkError)
        // Continue waiting if it's a transient error
        if (attempts >= maxAttempts - 1) {
          throw checkError
        }
      }
    }

    if (fileStatus !== "processed") {
      const errorMsg = `File not fully processed after ${attempts * 2}s (status: ${fileStatus}). This may cause extraction to fail.`
      console.error(`[PDF Upload] ✗ ${errorMsg}`)
      // Still return the file ID - let the extraction attempt fail with a clearer error
      // This helps us debug the issue
    }

    return fileResponse.id
  } catch (error) {
    console.error("[PDF Upload] ✗ Error uploading PDF to OpenAI:", error)
    if (error instanceof Error) {
      console.error("[PDF Upload]   Error message:", error.message)
    }
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
        ? "You are an expert at extracting tenant-chargeable items from bills and invoices. Extract water usage/charges, electricity usage/charges, and sewerage charges that tenants should pay. IMPORTANT: You must extract the billing period (e.g., 'March 2025', '2025-03', '03/2025') - this is critical. The period should be a single value that applies to ALL extracted items, as they all belong to the same billing period. Look for period information in headers, footers, or summary sections of the document. Return structured data."
        : "You are an expert at extracting landlord-payable items from bills and invoices. Extract levies, body corporate fees, municipality charges, and other items that the landlord/rental agent should pay on behalf of the property. Include beneficiary details (name, account number, bank code) and payment references. IMPORTANT: You must extract the billing period (e.g., 'March 2025', '2025-03', '03/2025') - this is critical. The period should be a single value that applies to ALL extracted items, as they all belong to the same billing period. Look for period information in headers, footers, or summary sections of the document. Return structured data."

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

    // CRITICAL: Verify file details before using in Responses API
    try {
      const fileDetails = await openai.files.retrieve(fileId)
      console.log(`[PDF Extraction] ⚠ File details before Responses API call:`, {
        id: fileDetails.id,
        filename: fileDetails.filename,
        status: fileDetails.status,
        bytes: fileDetails.bytes
      })
      if (!fileDetails.filename?.toLowerCase().endsWith(".pdf")) {
        console.error(`[PDF Extraction] ✗ CRITICAL: File "${fileDetails.filename}" missing .pdf extension - this will cause "got none" error!`)
      }
    } catch (verifyError) {
      console.warn(`[PDF Extraction] ⚠ Could not verify file details:`, verifyError)
    }

    // Use Responses API with structured outputs
    // Format: input can be a string or array of items (messages)
    // For file inputs, we use file_id in content array
    console.log(`[PDF Extraction] Calling Responses API with file_id: ${fileId}`)
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
    
    console.log(`[PDF Extraction] Responses API response received`)
    console.log(`[PDF Extraction] Output text length: ${outputText?.length || 0} characters`)
    console.log(`[PDF Extraction] Output text preview: ${outputText?.substring(0, 200) || "null"}...`)
    
    if (!outputText) {
      console.error(`[PDF Extraction] ✗ No output text in Responses API response`)
      console.error(`[PDF Extraction] Full response object:`, JSON.stringify(response, null, 2))
      throw new Error("No output text in Responses API response")
    }

    // Parse the JSON response
    let parsed: any
    try {
      parsed = JSON.parse(outputText)
      console.log(`[PDF Extraction] ✓ Successfully parsed JSON response`)
      console.log(`[PDF Extraction] Parsed data keys:`, Object.keys(parsed))
      if (purpose === "invoice_generation" && "tenantChargeableItems" in parsed) {
        console.log(`[PDF Extraction] Invoice data - tenantChargeableItems count: ${parsed.tenantChargeableItems?.length || 0}`)
        if (parsed.tenantChargeableItems?.length > 0) {
          console.log(`[PDF Extraction] First item:`, JSON.stringify(parsed.tenantChargeableItems[0], null, 2))
        }
      }
      if (purpose === "payment_processing" && "landlordPayableItems" in parsed) {
        console.log(`[PDF Extraction] Payment data - landlordPayableItems count: ${parsed.landlordPayableItems?.length || 0}`)
        if (parsed.landlordPayableItems?.length > 0) {
          console.log(`[PDF Extraction] First item:`, JSON.stringify(parsed.landlordPayableItems[0], null, 2))
        }
      }
    } catch (parseError) {
      console.error(`[PDF Extraction] ✗ Failed to parse JSON response:`, parseError)
      console.error(`[PDF Extraction] Raw output text:`, outputText)
      throw parseError
    }
    
    // Convert null values to undefined for optional fields (to match TypeScript types)
    // This is needed because OpenAI strict mode requires all properties to be in required array
    // but we make optional fields nullable, then convert null to undefined here
    if (purpose === "invoice_generation" && "tenantChargeableItems" in parsed) {
      const invoiceData = parsed as InvoiceExtractionData
      // Clean up null values in tenantChargeableItems
      invoiceData.tenantChargeableItems = invoiceData.tenantChargeableItems.map(item => ({
        ...item,
        usage: item.usage === null ? undefined : item.usage,
        periodStart: item.periodStart === null ? undefined : item.periodStart,
        periodEnd: item.periodEnd === null ? undefined : item.periodEnd,
        readingDate: item.readingDate === null ? undefined : item.readingDate
      }))
      // Log period before cleanup for debugging
      console.log(`[PDF Extraction] Invoice period before cleanup: "${invoiceData.period}" (type: ${typeof invoiceData.period})`)
      // Clean up null values in root level optional fields
      // IMPORTANT: Only delete if null, keep the period string if it exists (even if empty)
      if (invoiceData.period === null) {
        console.log(`[PDF Extraction] Deleting null period field`)
        delete invoiceData.period
      } else if (invoiceData.period) {
        console.log(`[PDF Extraction] Preserving period field: "${invoiceData.period}"`)
      }
      if (invoiceData.accountNumber === null) {
        delete invoiceData.accountNumber
      }
      return invoiceData
    }
    
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
      ? "You are an expert at extracting tenant-chargeable items from bills and invoices. Extract water usage/charges, electricity usage/charges, and sewerage charges that tenants should pay. IMPORTANT: You must extract the billing period (e.g., 'March 2025', '2025-03', '03/2025') - this is critical. The period should be a single value that applies to ALL extracted items, as they all belong to the same billing period. Look for period information in headers, footers, or summary sections of the document. Return structured data as JSON."
      : "You are an expert at extracting landlord-payable items from bills and invoices. Extract levies, body corporate fees, municipality charges, and other items that the landlord/rental agent should pay on behalf of the property. Include beneficiary details (name, account number, bank code) and payment references. IMPORTANT: You must extract the billing period (e.g., 'March 2025', '2025-03', '03/2025') - this is critical. The period should be a single value that applies to ALL extracted items, as they all belong to the same billing period. Look for period information in headers, footers, or summary sections of the document. Return structured data as JSON."

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
 * Can accept either a fileUrl (Supabase URL) or a direct Buffer
 */
export async function processPDFWithDualPurposeExtraction(
  fileUrlOrBuffer: string | Buffer,
  invoiceRule?: { 
    id: string
    extractionConfig?: Record<string, unknown>
    instruction?: string
  },
  paymentRule?: { 
    id: string
    extractionConfig?: Record<string, unknown>
    instruction?: string
  },
  fileName?: string
): Promise<{
  invoiceData: InvoiceExtractionData | null
  paymentData: PaymentExtractionData | null
}> {
  try {
    console.log("[PDF Extraction] Starting dual-purpose extraction")
    console.log("[PDF Extraction] Input type:", typeof fileUrlOrBuffer === "string" ? "URL" : "Buffer")
    console.log("[PDF Extraction] Invoice rule present:", !!invoiceRule, "Rule ID:", invoiceRule?.id)
    console.log("[PDF Extraction] Payment rule present:", !!paymentRule, "Rule ID:", paymentRule?.id)

    // Get file buffer - either from URL or use provided buffer
    let fileBuffer: Buffer
    let finalFileName: string

    if (typeof fileUrlOrBuffer === "string") {
      // It's a URL - download from Supabase
      console.log("[PDF Extraction] Downloading PDF from Supabase:", fileUrlOrBuffer)
      fileBuffer = await downloadPDFFromSupabase(fileUrlOrBuffer)
      finalFileName = fileName || fileUrlOrBuffer.split("/").pop() || "bill.pdf"
    } else {
      // It's already a Buffer - use it directly
      console.log("[PDF Extraction] Using provided Buffer directly")
      fileBuffer = fileUrlOrBuffer
      finalFileName = fileName || "bill.pdf"
    }

    // Ensure filename has .pdf extension (required by OpenAI for file type detection)
    if (!finalFileName.toLowerCase().endsWith(".pdf")) {
      // Remove any existing extension and add .pdf
      const nameWithoutExt = finalFileName.split(".").slice(0, -1).join(".") || finalFileName
      finalFileName = `${nameWithoutExt}.pdf`
      console.log(`[PDF Extraction] ⚠ Filename missing .pdf extension, renamed: ${fileName || "bill.pdf"} → ${finalFileName}`)
    }

    // Validate PDF before uploading to OpenAI
    const pdfMagicBytes = fileBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      throw new Error(`Invalid PDF file. Magic bytes: ${pdfMagicBytes}. File size: ${fileBuffer.length} bytes`)
    }
    console.log(`[PDF Extraction] ✓ PDF validated: ${finalFileName} (${fileBuffer.length} bytes)`)

    // Upload PDF directly to OpenAI Files API (use original buffer, not from Supabase)
    const fileId = await uploadPDFToOpenAI(fileBuffer, finalFileName)

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
