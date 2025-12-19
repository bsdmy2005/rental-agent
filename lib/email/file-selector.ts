import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"
import { checkUrlAccessibility } from "@/lib/storage/url-downloader"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Select relevant file(s) from multiple URLs using AI
 * @param urls - Array of URLs to choose from
 * @param customInstruction - Custom instruction to guide file selection
 * @returns Selected URL(s) - can be single URL or array based on instruction
 */
export async function selectRelevantFileFromLinks(
  urls: string[],
  customInstruction?: string
): Promise<string | string[]> {
  console.log(`[File Selector] Selecting relevant file(s) from ${urls.length} URL(s)...`)
  
  if (urls.length === 0) {
    throw new Error("No URLs provided")
  }
  
  if (urls.length === 1) {
    console.log("[File Selector] Only one URL found, using it directly")
    return urls[0]
  }
  
  // Get metadata for each URL
  console.log("[File Selector] Fetching metadata for URLs...")
  const urlMetadata = await Promise.all(
    urls.map(async (url) => {
      try {
        const metadata = await checkUrlAccessibility(url)
        return {
          url,
          accessible: metadata.accessible,
          contentType: metadata.contentType,
          contentLength: metadata.contentLength,
          fileName: extractFileNameFromUrl(url)
        }
      } catch (error) {
        console.warn(`[File Selector] ⚠ Failed to check URL ${url}:`, error)
        return {
          url,
          accessible: false,
          contentType: undefined,
          contentLength: undefined,
          fileName: extractFileNameFromUrl(url)
        }
      }
    })
  )
  
  // Filter to only accessible URLs
  const accessibleUrls = urlMetadata.filter(m => m.accessible)
  
  if (accessibleUrls.length === 0) {
    throw new Error("None of the URLs are accessible")
  }
  
  if (accessibleUrls.length === 1) {
    console.log("[File Selector] Only one accessible URL found, using it")
    return accessibleUrls[0].url
  }
  
  // Use AI to select relevant file(s)
  console.log("[File Selector] Using AI to select relevant file(s)...")
  
  try {
    const instruction = customInstruction
      ? `You are selecting the most relevant PDF file(s) from multiple URLs. ${customInstruction} Return JSON with selected URL(s) and reason.`
      : "You are selecting the most relevant PDF file(s) from multiple URLs. Consider file names, sizes, and which one is most likely to be the current statement or invoice. Return JSON with selected URL(s) and reason."
    
    const urlList = accessibleUrls.map((m, idx) => 
      `${idx + 1}. URL: ${m.url}\n   Filename: ${m.fileName}\n   Size: ${m.contentLength ? `${(m.contentLength / 1024).toFixed(2)} KB` : "unknown"}\n   Content-Type: ${m.contentType || "unknown"}`
    ).join("\n\n")
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: instruction
        },
        {
          role: "user",
          content: `Select the most relevant PDF file(s) from these URLs. Respond with JSON: {"selectedUrls": ["url1", "url2"], "reason": "brief explanation"}\n\n${urlList}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })
    
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from AI")
    }
    
    const decision = JSON.parse(content) as { 
      selectedUrls: string[] | string
      reason?: string 
    }
    
    const selectedUrls = Array.isArray(decision.selectedUrls) 
      ? decision.selectedUrls 
      : [decision.selectedUrls]
    
    // Validate selected URLs are in the original list
    const validUrls = selectedUrls.filter(url => urls.includes(url))
    
    if (validUrls.length === 0) {
      console.warn("[File Selector] ⚠ AI selected invalid URLs, falling back to first accessible URL")
      return accessibleUrls[0].url
    }
    
    console.log(`[File Selector] ✓ AI selected ${validUrls.length} file(s)`)
    if (decision.reason) {
      console.log(`[File Selector]   Reason: ${decision.reason}`)
    }
    
    // Return single URL if only one selected, otherwise return array
    return validUrls.length === 1 ? validUrls[0] : validUrls
  } catch (error) {
    console.error("[File Selector] ✗ AI selection failed, falling back to first accessible URL:", error)
    return accessibleUrls[0].url
  }
}

/**
 * Extract filename from URL
 */
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split("/").pop() || ""
    
    // Remove query parameters from filename
    return fileName.split("?")[0] || url.split("/").pop()?.split("?")[0] || "unknown"
  } catch {
    // Fallback: extract from URL string
    const match = url.match(/\/([^\/\?]+\.pdf)/i)
    return match ? match[1] : "unknown"
  }
}

