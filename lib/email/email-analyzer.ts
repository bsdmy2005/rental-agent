import OpenAI from "openai"
import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import { extractLinksFromEmail } from "./link-extractor"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Analyze email to determine if documents are attached or linked
 * Uses AI to make intelligent decisions based on email content
 */
export async function analyzeEmailForDocuments(
  payload: PostmarkWebhookPayload,
  customInstruction?: string
): Promise<{
  source: "attachments" | "links" | "both"
  links: string[] // Return URLs for backward compatibility
}> {
  console.log("[Email Analyzer] Analyzing email for document sources...")
  
  const hasAttachments = payload.Attachments && payload.Attachments.length > 0
  const htmlBody = payload.HtmlBody || ""
  const textBody = payload.TextBody || ""
  
  // First, extract links from email body
  const htmlLinks = htmlBody ? extractLinksFromEmail(htmlBody, true) : []
  const textLinks = textBody ? extractLinksFromEmail(textBody, false) : []
  
  // Combine and deduplicate links by URL
  const allLinksMap = new Map<string, { url: string; label?: string }>()
  for (const link of [...htmlLinks, ...textLinks]) {
    if (!allLinksMap.has(link.url)) {
      allLinksMap.set(link.url, link)
    }
  }
  const allLinks = Array.from(allLinksMap.values())
  
  console.log(`[Email Analyzer] Found ${hasAttachments ? payload.Attachments!.length : 0} attachment(s)`)
  console.log(`[Email Analyzer] Found ${allLinks.length} potential PDF link(s)`)
  
  // If we have attachments and no links, use attachments
  if (hasAttachments && allLinks.length === 0) {
    console.log("[Email Analyzer] ✓ Decision: Use attachments (no links found)")
    return {
      source: "attachments",
      links: []
    }
  }
  
  // If we have links and no attachments, use links
  if (!hasAttachments && allLinks.length > 0) {
    console.log("[Email Analyzer] ✓ Decision: Use links (no attachments found)")
    return {
      source: "links",
      links: allLinks.map(link => link.url) // Extract URLs for backward compatibility
    }
  }
  
  // If we have both, use AI to decide
  if (hasAttachments && allLinks.length > 0) {
    console.log("[Email Analyzer] Both attachments and links found - using AI to decide...")
    
    try {
      const instruction = customInstruction 
        ? `You are analyzing an email to determine the best source for PDF documents. ${customInstruction}`
        : "You are analyzing an email to determine the best source for PDF documents. Consider which source is more reliable and relevant. Typically, attachments are preferred over links, but links may be more up-to-date."
      
      const emailContent = `
Email Subject: ${payload.Subject || "(no subject)"}
From: ${payload.From || "(unknown)"}

Email Body (Text):
${textBody.substring(0, 2000)}

Email Body (HTML):
${htmlBody.substring(0, 2000)}

Attachments Found: ${hasAttachments ? payload.Attachments!.map(a => a.Name).join(", ") : "None"}
Links Found: ${allLinks.join(", ")}
`
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: instruction
          },
          {
            role: "user",
            content: `Analyze this email and determine the best source for PDF documents. Respond with JSON: {"source": "attachments" | "links" | "both", "reason": "brief explanation"}\n\n${emailContent}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
      
      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from AI")
      }
      
      const decision = JSON.parse(content) as { source: "attachments" | "links" | "both", reason?: string }
      
      console.log(`[Email Analyzer] ✓ AI Decision: ${decision.source}`)
      if (decision.reason) {
        console.log(`[Email Analyzer]   Reason: ${decision.reason}`)
      }
      
      return {
        source: decision.source,
        links: decision.source === "links" || decision.source === "both" ? allLinks.map(link => link.url) : []
      }
    } catch (error) {
      console.error("[Email Analyzer] ✗ AI analysis failed, defaulting to attachments:", error)
      // Fallback: prefer attachments if AI fails
      return {
        source: "attachments",
        links: []
      }
    }
  }
  
  // Default: no documents found
  console.log("[Email Analyzer] ⚠ No attachments or links found")
  return {
    source: "attachments",
    links: []
  }
}

