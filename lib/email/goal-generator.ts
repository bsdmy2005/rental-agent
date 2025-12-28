import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { extractEmailInfo } from "./email-info-extractor"
import { generateBrowserUseInstruction } from "./instruction-generator"

/**
 * Generate an optimized, token-efficient goal for agentic browser tasks
 * Uses local OpenAI preprocessing to extract relevant information from emails
 * and create concise instructions, avoiding sending raw email content to Browser Use API
 */
export async function generateAgenticGoal(
  url: string,
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule
): Promise<string> {
  console.log("[Goal Generator] Generating optimized goal with local email preprocessing...")

  try {
    // Step 1: Extract structured information from email (local OpenAI call)
    const emailInfo = await extractEmailInfo(email, url, rule)

    // Step 2: Generate concise Browser Use instruction from extracted info (local OpenAI call)
    const instruction = await generateBrowserUseInstruction(emailInfo, url, rule)

    const originalSize = (email.HtmlBody || email.TextBody || "").length
    const optimizedSize = instruction.length
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1)

    console.log(`[Goal Generator] ✓ Generated optimized instruction:`)
    console.log(`[Goal Generator]   Original email size: ${originalSize} chars`)
    console.log(`[Goal Generator]   Optimized instruction: ${optimizedSize} chars`)
    console.log(`[Goal Generator]   Token savings: ~${savings}%`)

    return instruction
  } catch (error) {
    console.error("[Goal Generator] ✗ Failed to generate optimized goal, using fallback:", error)

    // Fallback: Create simple instruction without full email content
    const emailSubject = email.Subject || ""
    const fallbackInstruction = `Navigate to ${url} and download the statement or invoice PDF. The email subject is: "${emailSubject}". Follow the instructions on the portal page to access and download the document.`

    console.log(`[Goal Generator] Using fallback instruction (${fallbackInstruction.length} chars)`)
    return fallbackInstruction
  }
}

