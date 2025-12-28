/**
 * Independent test script for browser-use agentic browser
 * 
 * Usage:
 *   npm run test:browser-use [URL] [GOAL]
 * 
 * Examples:
 *   npm run test:browser-use https://example.com "Navigate to the page"
 *   npm run test:browser-use "https://system.angor.co.za/..." "Enter PIN 537083 and download the statement PDF"
 * 
 * If URL contains markdown link syntax [url](url), it will be automatically extracted.
 */

import { processWithAgenticBrowser } from "../lib/email/agentic-browser"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local"), override: true })

async function main() {
  console.log("=".repeat(60))
  console.log("Browser-Use Agentic Browser Test")
  console.log("=".repeat(60))
  console.log()

  // Parse arguments - handle markdown links and quoted strings
  let testUrl = process.argv[2] || "https://example.com"
  let testGoal = process.argv.slice(3).join(" ") || "Navigate to the page and take a screenshot"
  
  // Clean up markdown link syntax [url](url) -> url
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/
  if (markdownLinkRegex.test(testUrl)) {
    const match = testUrl.match(markdownLinkRegex)
    if (match) {
      // Extract the actual URL from markdown link
      testUrl = match[2]
      // If goal wasn't provided separately, extract it from the rest
      if (testGoal === "Navigate to the page and take a screenshot" && match[1] !== match[2]) {
        const remaining = testUrl.replace(markdownLinkRegex, "").trim()
        if (remaining) {
          testGoal = remaining
        }
      }
    }
  }
  
  // Clean up URL - remove any extra text that might have been included
  // Extract just the URL part (starts with http:// or https://)
  const urlMatch = testUrl.match(/(https?:\/\/[^\s]+)/)
  if (urlMatch) {
    const extractedUrl = urlMatch[1]
    // If we extracted a URL and there's remaining text, that might be the goal
    const remaining = testUrl.replace(extractedUrl, "").trim()
    if (remaining && testGoal === "Navigate to the page and take a screenshot") {
      testGoal = remaining
    }
    testUrl = extractedUrl
  }
  
  // Clean up goal - remove markdown links if present
  testGoal = testGoal.replace(markdownLinkRegex, "$2").trim()
  
  // Test 1: Simple goal execution
  console.log("Test 1: Simple goal execution")
  console.log("-".repeat(60))
  
  console.log(`URL: ${testUrl}`)
  console.log(`Goal: ${testGoal}`)
  console.log()

  // Check for API key
  if (!process.env.BROWSER_USE_API_KEY) {
    console.error("ERROR: BROWSER_USE_API_KEY environment variable is not set")
    console.error("Please set it in .env.local file")
    process.exit(1)
  }

  const result = await processWithAgenticBrowser(
    testUrl,
    testGoal,
    {
      maxSteps: 50,
      maxTime: 300, // 5 minutes
      allowedDomains: [] // No restrictions for testing
    }
  )

  console.log()
  console.log("=".repeat(60))
  console.log("Test Results:")
  console.log("=".repeat(60))
  console.log(`Success: ${result.success}`)
  if (result.error) {
    console.log(`Error: ${result.error}`)
  }
  if (result.pdfBuffer) {
    console.log(`PDF Size: ${result.pdfBuffer.length} bytes`)
    console.log(`PDF Preview (first 100 bytes): ${result.pdfBuffer.slice(0, 100).toString("hex")}`)
  }
  if (result.trace) {
    console.log(`Steps: ${result.trace.length}`)
    console.log()
    console.log("Trace:")
    result.trace.forEach((step, idx) => {
      console.log(`  ${idx + 1}. [${step.step}] ${step.timestamp.toISOString()}`)
      if (step.data) {
        const dataStr = JSON.stringify(step.data, null, 2).substring(0, 200)
        if (dataStr.length > 0) {
          console.log(`     Data: ${dataStr}${JSON.stringify(step.data).length > 200 ? "..." : ""}`)
        }
      }
    })
  }
  console.log()
}

main().catch((error) => {
  console.error("Test failed:", error)
  process.exit(1)
})
