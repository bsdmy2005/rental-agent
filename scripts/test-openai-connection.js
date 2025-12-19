#!/usr/bin/env node

/**
 * Standalone script to test OpenAI API connection
 * Usage: node scripts/test-openai-connection.js
 */

const { config } = require("dotenv")
const { resolve } = require("path")
const OpenAI = require("openai")

// Load environment variables from .env.local (override existing env vars)
const result = config({ path: resolve(process.cwd(), ".env.local"), override: true })
if (result.error) {
  console.error("Error loading .env.local:", result.error)
  process.exit(1)
}

async function testOpenAIConnection() {
  console.log("=".repeat(60))
  console.log("OpenAI API Connection Test")
  console.log("=".repeat(60))
  console.log()

  // Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error("❌ ERROR: OPENAI_API_KEY is not set in environment variables")
    console.log()
    console.log("Please ensure .env.local contains:")
    console.log("OPENAI_API_KEY=sk-proj-...")
    process.exit(1)
  }

  // Show what we're reading (first 10 and last 4 chars for security)
  const keyPreview = apiKey.length > 14 
    ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
    : apiKey.substring(0, 10) + "..."
  
  console.log(`📋 API Key found: ${keyPreview}`)
  console.log(`📏 Key length: ${apiKey.length} characters`)
  console.log()

  // Check for placeholder values
  if (apiKey.includes("your-") || apiKey.includes("********") || apiKey.length < 20) {
    console.error("❌ ERROR: API key appears to be a placeholder")
    console.log(`   Current value: ${keyPreview}`)
    console.log()
    console.log("Please set a valid API key in .env.local")
    process.exit(1)
  }

  // Validate key format
  if (!apiKey.startsWith("sk-")) {
    console.warn("⚠️  WARNING: API key doesn't start with 'sk-'")
    console.log(`   Current value starts with: ${apiKey.substring(0, 3)}`)
    console.log()
  }

  console.log("🔄 Testing OpenAI API connection...")
  console.log()

  try {
    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey
    })

    // Test 1: List models (lightweight call)
    console.log("Test 1: Listing available models...")
    const models = await openai.models.list()
    console.log(`✅ Success! Found ${models.data.length} models`)
    console.log(`   Sample models: ${models.data.slice(0, 3).map(m => m.id).join(", ")}`)
    console.log()

    // Test 2: Simple chat completion (if you want to test actual usage)
    console.log("Test 2: Testing chat completion...")
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Say 'Connection successful!' if you can read this."
        }
      ],
      max_tokens: 10
    })

    const response = completion.choices[0]?.message?.content
    console.log(`✅ Success! Response: "${response}"`)
    console.log()

    console.log("=".repeat(60))
    console.log("✅ All tests passed! OpenAI API connection is working.")
    console.log("=".repeat(60))
    
  } catch (error) {
    console.error("=".repeat(60))
    console.error("❌ OpenAI API connection failed!")
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
      console.error()
      console.error("Full error:")
      console.error(JSON.stringify(error, null, 2))
    } else {
      console.error("Error:", error.message || error)
      console.error()
      console.error("Full error details:")
      console.error(JSON.stringify(error, null, 2))
    }
    
    process.exit(1)
  }
}

// Run the test
testOpenAIConnection().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})

