import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { extractLinksFromEmail, extractAllLinksFromEmail } from "@/lib/email/link-extractor"

export type ExtractionLane = "lane1_attachments" | "lane2_direct" | "lane3_interactive" | "unknown"

export interface LaneDecision {
  lane: ExtractionLane
  reason: string
  confidence: number
  documentLinks?: Array<{ url: string; label?: string; linkType: "direct_pdf" | "interactive_portal" }>
}

/**
 * Determine which lane to use for email processing
 * Uses AI to analyze links and identify document links vs other links
 */
export async function decideLane(
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule
): Promise<LaneDecision> {
  console.log("[Decision Matrix] Deciding lane for email processing...")
  console.log(`[Decision Matrix] Rule preferred lane: ${rule.preferredLane || "auto"}`)

  // If rule specifies a preferred lane, use it (with validation)
  if (rule.preferredLane && rule.preferredLane !== "auto") {
    const preferredLane = rule.preferredLane as ExtractionLane
    console.log(`[Decision Matrix] ✓ Using preferred lane: ${preferredLane}`)
    return {
      lane: preferredLane,
      reason: `Rule specifies preferred lane: ${preferredLane}`,
      confidence: 1.0
    }
  }

  // Auto-detection logic
  const hasAttachments = email.Attachments && email.Attachments.length > 0
  const hasPdfAttachments =
    hasAttachments &&
    email.Attachments!.some(
      (att) =>
        att.ContentType === "application/pdf" || att.Name.toLowerCase().endsWith(".pdf")
    )

  // Extract links from email body
  const htmlBody = email.HtmlBody || ""
  const textBody = email.TextBody || ""
  
  // Extract ALL links (not just PDF links)
  const htmlAllLinks = htmlBody ? extractAllLinksFromEmail(htmlBody, true) : []
  const textAllLinks = textBody ? extractAllLinksFromEmail(textBody, false) : []
  
  // Combine and deduplicate all links
  const allLinksMap = new Map<string, { url: string; label?: string }>()
  for (const link of [...htmlAllLinks, ...textAllLinks]) {
    if (!allLinksMap.has(link.url)) {
      allLinksMap.set(link.url, link)
    }
  }
  const allLinks = Array.from(allLinksMap.values())
  
  // Use AI to analyze links and identify document links
  let documentLinks: Array<{ url: string; label?: string; linkType: "direct_pdf" | "interactive_portal" }> = []
  let otherLinks: Array<{ url: string; label?: string }> = []
  
  if (allLinks.length > 0) {
    console.log(`[Decision Matrix] Using AI to analyze ${allLinks.length} link(s)...`)
    try {
      const { analyzeLinksForDocuments } = await import("./email-analyzer")
      const analysis = await analyzeLinksForDocuments(
        email,
        allLinks,
        rule.emailProcessingInstruction || undefined
      )
      documentLinks = analysis.documentLinks
      otherLinks = analysis.otherLinks
      if (analysis.reason) {
        console.log(`[Decision Matrix] AI analysis: ${analysis.reason}`)
      }
    } catch (error) {
      console.error("[Decision Matrix] ✗ AI link analysis failed, using fallback:", error)
      // Fallback: treat all links as potential document links
      documentLinks = allLinks.map(link => ({
        url: link.url,
        label: link.label,
        linkType: link.url.toLowerCase().endsWith(".pdf") ? "direct_pdf" : "interactive_portal"
      }))
    }
  }
  
  // Separate document links by type
  const directPdfLinks = documentLinks.filter(link => link.linkType === "direct_pdf")
  const interactivePortalLinks = documentLinks.filter(link => link.linkType === "interactive_portal")
  
  const hasAnyLinks = allLinks.length > 0
  const hasPdfLinks = directPdfLinks.length > 0
  const hasInteractiveLinks = interactivePortalLinks.length > 0

  console.log(`[Decision Matrix] Email analysis:`)
  console.log(`[Decision Matrix]   Has attachments: ${hasAttachments}`)
  console.log(`[Decision Matrix]   Has PDF attachments: ${hasPdfAttachments}`)
  console.log(`[Decision Matrix]   Total links found: ${allLinks.length}`)
  console.log(`[Decision Matrix]   Document links: ${documentLinks.length} (${directPdfLinks.length} direct PDF, ${interactivePortalLinks.length} interactive)`)
  console.log(`[Decision Matrix]   Other links (ignored): ${otherLinks.length}`)
  if (documentLinks.length > 0) {
    documentLinks.forEach((link, idx) => {
      console.log(`[Decision Matrix]     Document link ${idx + 1}: ${link.url.substring(0, 80)}... (${link.linkType})`)
    })
  }

  // Lane 1: Attachments (fast path)
  if (hasPdfAttachments) {
    console.log(`[Decision Matrix] ✓ Selected Lane 1: Attachments`)
    return {
      lane: "lane1_attachments",
      reason: "Email contains PDF attachments",
      confidence: 0.9
    }
  }

  // Lane 2: Direct download (if AI identified direct PDF links)
  if (hasPdfLinks) {
    console.log(`[Decision Matrix] ✓ Selected Lane 2: Direct Download (found ${directPdfLinks.length} direct PDF link(s))`)
    return {
      lane: "lane2_direct",
      reason: `AI identified ${directPdfLinks.length} direct PDF link(s)`,
      confidence: 0.9,
      documentLinks: directPdfLinks
    }
  }

  // Lane 3: Interactive portal (if AI identified interactive portal links)
  if (hasInteractiveLinks) {
    console.log(`[Decision Matrix] ✓ Selected Lane 3: Interactive Portal (found ${interactivePortalLinks.length} interactive portal link(s))`)
    return {
      lane: "lane3_interactive",
      reason: `AI identified ${interactivePortalLinks.length} interactive portal link(s) requiring authentication`,
      confidence: 0.9,
      documentLinks: interactivePortalLinks
    }
  }

  // If we have links but AI didn't identify any as document links, they might be other types
  // Still try Lane 3 as fallback (might be interactive portal that AI didn't classify correctly)
  if (hasAnyLinks && documentLinks.length === 0) {
    console.log(`[Decision Matrix] ⚠ Links found but AI didn't identify as document links, trying Lane 3 as fallback`)
    // Use all links as fallback (treat as interactive portals)
    const fallbackLinks = allLinks.map(link => ({
      url: link.url,
      label: link.label,
      linkType: "interactive_portal" as const
    }))
    return {
      lane: "lane3_interactive",
      reason: "Links found but not identified as direct PDFs, attempting interactive portal",
      confidence: 0.5,
      documentLinks: fallbackLinks
    }
  }

  // Default: unknown
  console.log(`[Decision Matrix] ⚠ Selected Lane: Unknown (no attachments or links)`)
  return {
    lane: "unknown",
    reason: "No attachments or links found in email",
    confidence: 0.5
  }
}

