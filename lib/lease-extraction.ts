"use server"

import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"

// Explicitly load .env.local to ensure we get the correct API key
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set")
}

const openai = new OpenAI({
  apiKey: apiKey
})

export interface LeaseExtractionData {
  startDate: string // ISO format date string
  endDate: string // ISO format date string
  rentalAmount?: number | null
  terms?: string | null
  propertyAddress?: string | null
  tenantName?: string | null
  tenantIdNumber?: string | null // ID number or passport number
  tenantEmail?: string | null
  tenantPhone?: string | null
  landlordName?: string | null
}

// JSON Schema for lease extraction
const LEASE_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    startDate: {
      type: "string",
      description: "Lease start date in ISO format (YYYY-MM-DD). This is the date the lease begins."
    },
    endDate: {
      type: "string",
      description: "Lease end date in ISO format (YYYY-MM-DD). This is the date the lease expires."
    },
    rentalAmount: {
      type: ["number", "null"],
      description: "Monthly rental amount specified in the lease agreement. Can be null if not found."
    },
    terms: {
      type: ["string", "null"],
      description: "Lease terms or additional notes (optional). Can be null if not found."
    },
    propertyAddress: {
      type: ["string", "null"],
      description: "Property address mentioned in the lease (optional). Can be null if not found."
    },
    tenantName: {
      type: ["string", "null"],
      description: "Full name of the tenant as mentioned in the lease agreement. Can be null if not found."
    },
    tenantIdNumber: {
      type: ["string", "null"],
      description: "Tenant's ID number or passport number as mentioned in the lease agreement. Can be null if not found."
    },
    tenantEmail: {
      type: ["string", "null"],
      description: "Tenant's email address as mentioned in the lease agreement. Can be null if not found."
    },
    tenantPhone: {
      type: ["string", "null"],
      description: "Tenant's phone number as mentioned in the lease agreement. Can be null if not found."
    },
    landlordName: {
      type: ["string", "null"],
      description: "Landlord name mentioned in the lease (optional). Can be null if not found."
    }
  },
  required: ["startDate", "endDate", "rentalAmount", "terms", "propertyAddress", "tenantName", "tenantIdNumber", "tenantEmail", "tenantPhone", "landlordName"],
  additionalProperties: false
} as const

/**
 * Upload PDF to OpenAI Files API
 */
async function uploadPDFToOpenAI(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("File buffer is empty")
    }

    // Validate PDF magic bytes
    const pdfMagicBytes = fileBuffer.slice(0, 4).toString("ascii")
    if (pdfMagicBytes !== "%PDF") {
      throw new Error(`File is not a valid PDF. Magic bytes: ${pdfMagicBytes}`)
    }

    // Ensure filename has .pdf extension
    let finalFileName = fileName
    if (!finalFileName.toLowerCase().endsWith(".pdf")) {
      const nameWithoutExt = finalFileName.split(".").slice(0, -1).join(".") || finalFileName
      finalFileName = `${nameWithoutExt}.pdf`
      console.log(`[Lease Upload] ⚠ Filename missing .pdf extension, renamed: ${fileName} → ${finalFileName}`)
    }

    console.log(`[Lease Upload] Uploading PDF to OpenAI: ${finalFileName} (${fileBuffer.length} bytes)`)

    const uint8Array = new Uint8Array(fileBuffer)
    const file = new File([uint8Array], finalFileName, { type: "application/pdf" })

    const fileResponse = await openai.files.create({
      file,
      purpose: "user_data"
    })

    console.log(`[Lease Upload] ✓ File uploaded successfully. File ID: ${fileResponse.id}`)

    // Wait for file to be processed
    let fileStatus: string = fileResponse.status
    let attempts = 0
    const maxAttempts = 60

    while ((fileStatus === "uploaded" || fileStatus === "pending") && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      try {
        const fileInfo = await openai.files.retrieve(fileResponse.id)
        fileStatus = fileInfo.status as string
        attempts++

        if (fileStatus === "processed") {
          console.log(`[Lease Upload] ✓ File processed by OpenAI`)
          break
        } else if (fileStatus === "error") {
          const errorDetails = await openai.files.retrieve(fileResponse.id)
          throw new Error(`File processing failed: ${JSON.stringify(errorDetails)}`)
        }
      } catch (checkError) {
        console.error(`[Lease Upload] Error checking file status:`, checkError)
        if (attempts >= maxAttempts - 1) {
          throw checkError
        }
      }
    }

    if (fileStatus !== "processed") {
      throw new Error(`File not fully processed after ${attempts * 2}s (status: ${fileStatus})`)
    }

    return fileResponse.id
  } catch (error) {
    console.error("[Lease Upload] ✗ Error uploading PDF to OpenAI:", error)
    throw error
  }
}

/**
 * Extract lease dates from PDF using OpenAI Responses API
 */
export async function extractLeaseDatesFromPDF(
  fileBuffer: Buffer,
  fileName: string
): Promise<LeaseExtractionData> {
  try {
    console.log(`[Lease Extraction] Starting extraction for: ${fileName}`)

    // Upload PDF to OpenAI
    const fileId = await uploadPDFToOpenAI(fileBuffer, fileName)

    // Extract data using Responses API
    const instructions = `You are an expert at extracting lease agreement information from PDF documents. Extract ALL tenant information including:
- Tenant full name
- Tenant ID number or passport number
- Tenant email address
- Tenant phone number
- Monthly rental amount
- Lease start date (convert to ISO format YYYY-MM-DD)
- Lease end date (convert to ISO format YYYY-MM-DD)
- Property address
- Landlord name
- Any lease terms or notes

Be thorough and extract all available information. For dates, be precise and convert them to ISO format (YYYY-MM-DD).`

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
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lease_extraction",
          strict: true,
          schema: LEASE_EXTRACTION_SCHEMA
        }
      }
    })

    console.log(`[Lease Extraction] ✓ Extraction completed. Response ID: ${response.id}`)

    // Extract the output text from the response (Responses API returns output_text directly)
    const outputText = response.output_text

    console.log(`[Lease Extraction] Responses API response received`)
    console.log(`[Lease Extraction] Output text length: ${outputText?.length || 0} characters`)

    if (!outputText) {
      console.error(`[Lease Extraction] ✗ No output text in Responses API response`)
      console.error(`[Lease Extraction] Full response object:`, JSON.stringify(response, null, 2))
      throw new Error("No output text in Responses API response")
    }

    // Parse the JSON response
    let parsed: LeaseExtractionData
    try {
      parsed = JSON.parse(outputText)
      console.log(`[Lease Extraction] ✓ Successfully parsed JSON response`)
    } catch (parseError) {
      console.error(`[Lease Extraction] ✗ Failed to parse JSON response:`, parseError)
      console.error(`[Lease Extraction] Raw output text:`, outputText)
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
    }

    // Convert null values to undefined for optional fields
    const processedData: LeaseExtractionData = {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      rentalAmount: parsed.rentalAmount ?? undefined,
      terms: parsed.terms ?? undefined,
      propertyAddress: parsed.propertyAddress ?? undefined,
      tenantName: parsed.tenantName ?? undefined,
      tenantIdNumber: parsed.tenantIdNumber ?? undefined,
      tenantEmail: parsed.tenantEmail ?? undefined,
      tenantPhone: parsed.tenantPhone ?? undefined,
      landlordName: parsed.landlordName ?? undefined
    }

    console.log(`[Lease Extraction] ✓ Successfully extracted lease data`)
    console.log(`[Lease Extraction]   Tenant Name: ${processedData.tenantName || "N/A"}`)
    console.log(`[Lease Extraction]   Tenant ID: ${processedData.tenantIdNumber || "N/A"}`)
    console.log(`[Lease Extraction]   Tenant Email: ${processedData.tenantEmail || "N/A"}`)
    console.log(`[Lease Extraction]   Tenant Phone: ${processedData.tenantPhone || "N/A"}`)
    console.log(`[Lease Extraction]   Rental Amount: ${processedData.rentalAmount || "N/A"}`)
    console.log(`[Lease Extraction]   Start Date: ${processedData.startDate}`)
    console.log(`[Lease Extraction]   End Date: ${processedData.endDate}`)

    return processedData
  } catch (error) {
    console.error("[Lease Extraction] ✗ Error extracting lease dates:", error)
    throw error
  }
}

