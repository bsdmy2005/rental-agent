#!/usr/bin/env node

/**
 * Standalone script to test OpenAI Responses API
 * Usage: node scripts/test-responses-api.js <path-to-pdf-file>
 */

const { config } = require("dotenv")
const { resolve } = require("path")
const { readFileSync, existsSync } = require("fs")
const OpenAI = require("openai")

// Load environment variables from .env.local (override existing env vars)
const result = config({ path: resolve(process.cwd(), ".env.local"), override: true })
if (result.error) {
  console.error("Error loading .env.local:", result.error)
  process.exit(1)
}

async function testResponsesAPI(pdfPath) {
  console.log("=".repeat(60))
  console.log("OpenAI Responses API Test")
  console.log("=".repeat(60))
  console.log()

  // Check if PDF file exists
  if (!pdfPath) {
    console.error("❌ ERROR: Please provide a PDF file path")
    console.log()
    console.log("Usage: node scripts/test-responses-api.js <path-to-pdf>")
    console.log("Example: node scripts/test-responses-api.js ./test.pdf")
    process.exit(1)
  }

  if (!existsSync(pdfPath)) {
    console.error(`❌ ERROR: File not found: ${pdfPath}`)
    process.exit(1)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("❌ ERROR: OPENAI_API_KEY is not set")
    process.exit(1)
  }

  const keyPreview = apiKey.length > 14 
    ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
    : apiKey.substring(0, 10) + "..."
  
  console.log(`📋 API Key: ${keyPreview}`)
  console.log(`📄 PDF file: ${pdfPath}`)
  console.log()

  // Read PDF file
  let fileBuffer
  try {
    fileBuffer = readFileSync(pdfPath)
    console.log(`✅ PDF file read successfully (${fileBuffer.length} bytes)`)
    console.log()
  } catch (error) {
    console.error("❌ ERROR: Failed to read PDF file:", error.message)
    process.exit(1)
  }

  try {
    const openai = new OpenAI({ apiKey })

    console.log("Step 1: Uploading PDF to OpenAI Files API...")
    const uint8Array = new Uint8Array(fileBuffer)
    const fileName = pdfPath.split("/").pop() || "test.pdf"
    const file = new File([uint8Array], fileName, { type: "application/pdf" })

    const fileResponse = await openai.files.create({
      file: file,
      purpose: "user_data"
    })

    console.log(`✅ PDF uploaded! File ID: ${fileResponse.id}`)
    console.log()

    // Wait for file to be processed
    console.log("Step 2: Waiting for file to be processed...")
    let fileStatus = fileResponse.status
    while (fileStatus !== "processed" && fileStatus !== "error") {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const retrieved = await openai.files.retrieve(fileResponse.id)
      fileStatus = retrieved.status
      console.log(`   Status: ${fileStatus}`)
    }

    if (fileStatus === "error") {
      throw new Error("File processing failed")
    }

    console.log("✅ File processed successfully!")
    console.log()

    console.log("Step 3: Testing Responses API with structured output...")
    
    // Test with simple text input first
    console.log("Test 3a: Simple text input...")
    const simpleResponse = await openai.responses.create({
      model: "gpt-4o",
      input: "Say 'Responses API works!' if you can read this.",
      text: {
        format: {
          type: "json_schema",
          name: "test_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              message: { type: "string" }
            },
            required: ["message"],
            additionalProperties: false
          }
        }
      }
    })

    console.log(`✅ Simple response received:`)
    console.log(`   ${simpleResponse.output_text}`)
    console.log()

    // Test with file using file_search tool (if available)
    console.log("Test 3b: Testing file input...")
    try {
      // Try using the file in a message format
      const fileExtractionResponse = await openai.responses.create({
        model: "gpt-5.2-2025-12-11",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                file_id: fileResponse.id
              },
              {
                type: "input_text",
                text: "Extract any amounts or charges mentioned in this document. Return as JSON with a 'charges' array."
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "pdf_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                charges: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      amount: { type: "number" }
                    },
                    required: ["description", "amount"],
                    additionalProperties: false
                  }
                }
              },
              required: ["charges"],
              additionalProperties: false
            }
          }
        }
      })

      console.log(`✅ File response received:`)
      console.log(`   ${fileExtractionResponse.output_text}`)
    } catch (fileError) {
      console.log(`⚠️  File input test failed: ${fileError.message}`)
      console.log("   This might not be supported yet in the Responses API")
    }

    console.log()
    console.log("Step 4: Cleaning up...")
    await openai.files.delete(fileResponse.id)
    console.log("✅ File deleted")
    console.log()

    console.log("=".repeat(60))
    console.log("✅ Responses API test completed!")
    console.log("=".repeat(60))
    
  } catch (error) {
    console.error("=".repeat(60))
    console.error("❌ Test failed!")
    console.error("=".repeat(60))
    console.error()
    console.error("Error:", error.message)
    console.error()
    console.error("Full error:")
    console.error(JSON.stringify(error, null, 2))
    process.exit(1)
  }
}

const pdfPath = process.argv[2]
testResponsesAPI(pdfPath).catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})

