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

/**
 * Analyze email links to identify which are document links (statements/invoices)
 * vs other links (ads, social media, unsubscribe, etc.)
 * Uses AI to intelligently identify relevant document links
 */
export async function analyzeLinksForDocuments(
  payload: PostmarkWebhookPayload,
  allLinks: Array<{ url: string; label?: string }>,
  customInstruction?: string
): Promise<{
  documentLinks: Array<{ url: string; label?: string; linkType: "direct_pdf" | "interactive_portal" }>
  otherLinks: Array<{ url: string; label?: string }>
  reason?: string
}> {
  console.log("[Email Analyzer] Analyzing links to identify document links...")
  
  if (allLinks.length === 0) {
    return {
      documentLinks: [],
      otherLinks: []
    }
  }

  // If only one link, it's likely the document link
  if (allLinks.length === 1) {
    console.log("[Email Analyzer] Only one link found, assuming it's the document link")
    return {
      documentLinks: [
        {
          url: allLinks[0].url,
          label: allLinks[0].label,
          linkType: allLinks[0].url.toLowerCase().endsWith(".pdf") ? "direct_pdf" : "interactive_portal"
        }
      ],
      otherLinks: []
    }
  }

  try {
    const htmlBody = payload.HtmlBody || ""
    const textBody = payload.TextBody || ""
    
    // Prepare link information for AI
    const linksInfo = allLinks.map((link, index) => ({
      index: index + 1,
      url: link.url,
      label: link.label || "(no label)",
      context: extractLinkContext(htmlBody + textBody, link.url)
    }))

    const instruction = customInstruction
      ? `You are analyzing an email to identify which links point to documents (statements, invoices, bills). ${customInstruction}`
      : `You are analyzing an email to identify which links point to documents (statements, invoices, bills).
      
Ignore links that are:
- Advertisement or marketing links
- Social media links (Facebook, Twitter, LinkedIn, etc.)
- Unsubscribe links
- Company website homepages
- App store links
- General information pages

Focus on links that:
- Point to statements, invoices, bills, or financial documents
- Require authentication (interactive portals)
- Are labeled with terms like "View Statement", "Download Invoice", "View Details", etc.

For each document link, classify it as:
- "direct_pdf": Link directly downloads a PDF file (ends in .pdf or clearly downloads PDF)
- "interactive_portal": Link opens a web page that requires interaction (login, PIN entry, etc.) to access the document`

    const emailContent = `
Email Subject: ${payload.Subject || "(no subject)"}
From: ${payload.From || "(unknown)"}

Email Body (Text):
${textBody.substring(0, 3000)}

Email Body (HTML):
${htmlBody.substring(0, 3000)}

Links Found:
${linksInfo.map(link => `${link.index}. URL: ${link.url}\n   Label: ${link.label}\n   Context: ${link.context}`).join("\n\n")}
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
          content: `Analyze the email and links above. Identify which links are document links (statements/invoices/bills) and classify them as direct PDF or interactive portal. Respond with JSON:
{
  "documentLinks": [
    {"index": 1, "linkType": "direct_pdf" | "interactive_portal", "reason": "why this is a document link"}
  ],
  "otherLinks": [{"index": 2, "reason": "why this is not a document link"}],
  "summary": "brief explanation of the analysis"
}

${emailContent}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from AI")
    }

    const analysis = JSON.parse(content) as {
      documentLinks?: Array<{ index: number; linkType: "direct_pdf" | "interactive_portal"; reason?: string }>
      otherLinks?: Array<{ index: number; reason?: string }>
      summary?: string
    }

    // Map AI results back to actual links
    const documentLinks: Array<{ url: string; label?: string; linkType: "direct_pdf" | "interactive_portal" }> = []
    const otherLinks: Array<{ url: string; label?: string }> = []

    const documentIndices = new Set((analysis.documentLinks || []).map(d => d.index))
    
    allLinks.forEach((link, index) => {
      const linkIndex = index + 1
      if (documentIndices.has(linkIndex)) {
        const docLink = analysis.documentLinks!.find(d => d.index === linkIndex)
        documentLinks.push({
          url: link.url,
          label: link.label,
          linkType: docLink?.linkType || "interactive_portal"
        })
      } else {
        otherLinks.push(link)
      }
    })

    console.log(`[Email Analyzer] ✓ AI Analysis Complete:`)
    console.log(`[Email Analyzer]   Document links: ${documentLinks.length}`)
    console.log(`[Email Analyzer]   Other links: ${otherLinks.length}`)
    if (analysis.summary) {
      console.log(`[Email Analyzer]   Summary: ${analysis.summary}`)
    }

    return {
      documentLinks,
      otherLinks,
      reason: analysis.summary
    }
  } catch (error) {
    console.error("[Email Analyzer] ✗ AI link analysis failed:", error)
    // Fallback: assume all links are document links if AI fails
    console.log("[Email Analyzer]   Falling back to treating all links as document links")
    return {
      documentLinks: allLinks.map(link => ({
        url: link.url,
        label: link.label,
        linkType: link.url.toLowerCase().endsWith(".pdf") ? "direct_pdf" : "interactive_portal"
      })),
      otherLinks: []
    }
  }
}

/**
 * Extract context around a link in the email body
 */
function extractLinkContext(emailBody: string, url: string): string {
  // Find the link in the email body
  const urlIndex = emailBody.toLowerCase().indexOf(url.toLowerCase())
  if (urlIndex === -1) {
    return "Link not found in email body"
  }

  // Extract 200 characters before and after the link
  const start = Math.max(0, urlIndex - 200)
  const end = Math.min(emailBody.length, urlIndex + url.length + 200)
  const context = emailBody.substring(start, end)
  
  // Clean up HTML tags if present
  const cleaned = context.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  
  return cleaned.substring(0, 300) + (cleaned.length > 300 ? "..." : "")
}

