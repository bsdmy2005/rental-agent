#!/usr/bin/env node

/**
 * Standalone script to test PDF upload to OpenAI
 * Usage: node scripts/test-pdf-upload.js <path-to-pdf-file>
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

async function testPDFUpload(pdfPath) {
  console.log("=".repeat(60))
  console.log("OpenAI PDF Upload Test")
  console.log("=".repeat(60))
  console.log()

  // Check if PDF file exists
  if (!pdfPath) {
    console.error("❌ ERROR: Please provide a PDF file path")
    console.log()
    console.log("Usage: node scripts/test-pdf-upload.js <path-to-pdf>")
    console.log("Example: node scripts/test-pdf-upload.js ./test.pdf")
    process.exit(1)
  }

  if (!existsSync(pdfPath)) {
    console.error(`❌ ERROR: File not found: ${pdfPath}`)
    process.exit(1)
  }

  // Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error("❌ ERROR: OPENAI_API_KEY is not set in environment variables")
    process.exit(1)
  }

  // Show what we're reading (first 10 and last 4 chars for security)
  const keyPreview = apiKey.length > 14 
    ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
    : apiKey.substring(0, 10) + "..."
  
  console.log(`📋 API Key: ${keyPreview}`)
  console.log(`📏 Key length: ${apiKey.length} characters`)
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

  console.log("🔄 Testing OpenAI API connection...")
  console.log()

  try {
    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey
    })

    // Convert Buffer to Uint8Array for File constructor
    const uint8Array = new Uint8Array(fileBuffer)
    const fileName = pdfPath.split("/").pop() || "test.pdf"
    const file = new File([uint8Array], fileName, { type: "application/pdf" })

    console.log("Step 1: Uploading PDF to OpenAI Files API...")
    const fileResponse = await openai.files.create({
      file: file,
      purpose: "user_data"
    })

    console.log(`✅ PDF uploaded successfully!`)
    console.log(`   File ID: ${fileResponse.id}`)
    console.log(`   File name: ${fileResponse.filename}`)
    console.log(`   Purpose: ${fileResponse.purpose}`)
    console.log(`   Bytes: ${fileResponse.bytes}`)
    console.log()

    console.log("Step 2: Testing file retrieval...")
    const retrievedFile = await openai.files.retrieve(fileResponse.id)
    console.log(`✅ File retrieved successfully!`)
    console.log(`   Status: ${retrievedFile.status}`)
    console.log()

    console.log("Step 3: Cleaning up - deleting uploaded file...")
    await openai.files.delete(fileResponse.id)
    console.log(`✅ File deleted successfully!`)
    console.log()

    console.log("=".repeat(60))
    console.log("✅ All tests passed! PDF upload to OpenAI works correctly.")
    console.log("=".repeat(60))
    console.log()
    console.log("This confirms:")
    console.log("1. Your API key is valid")
    console.log("2. File upload works")
    console.log("3. File retrieval works")
    console.log("4. File deletion works")
    
  } catch (error) {
    console.error("=".repeat(60))
    console.error("❌ OpenAI PDF upload failed!")
    console.error("=".repeat(60))
    console.error()
    
    if (error?.status === 401 || error?.code === "invalid_api_key") {
      console.error("Error: Invalid API key")
      console.error(`   Status: ${error.status || error.code}`)
      console.error(`   Message: ${error.message || error.error?.message || "Unknown error"}`)
      console.error()
      console.error("The API key being used appears to be invalid.")
      console.error(`   Key preview: ${keyPreview}`)
      console.error()
      console.error("Please check:")
      console.error("1. Your .env.local file has the correct key")
      console.error("2. The key is active at https://platform.openai.com/account/api-keys")
      console.error("3. There are no extra spaces or quotes around the key")
    } else if (error?.status === 429 || error?.code === "insufficient_quota") {
      console.error("Error: Quota exceeded")
      console.error("   Your OpenAI account has exceeded its quota or needs billing setup.")
      console.error("   Please check: https://platform.openai.com/account/billing")
    } else {
      console.error("Error:", error.message || error)
      console.error()
      console.error("Full error details:")
      console.error(JSON.stringify(error, null, 2))
    }
    
    process.exit(1)
  }
}

// Get PDF path from command line arguments
const pdfPath = process.argv[2]

// Run the test
testPDFUpload(pdfPath).catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})

