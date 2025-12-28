"use server"

import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { decideLane, type ExtractionLane } from "@/lib/email/decision-matrix"
import { processAttachments } from "@/lib/email/lanes/lane1-attachments"
import { processDirectLinks } from "@/lib/email/lanes/lane2-direct-download"
import { processAgenticPortal } from "@/lib/email/lanes/lane3b-agentic"
import { extractLinksFromEmail, extractAllLinksFromEmail } from "@/lib/email/link-extractor"

export interface LaneProcessingResult {
  success: boolean
  pdfBuffers: Array<{ name: string; content: Buffer; url?: string }>
  lane: ExtractionLane
  requiresEscalation: boolean
  escalationReason?: string
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Orchestrate email processing through appropriate lane
 */
export async function processEmailWithLanes(
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule
): Promise<LaneProcessingResult> {
  console.log("[Lane Orchestrator] Starting lane-based email processing...")

  // Step 0: Decide which lane to use (now async with AI analysis)
  const decision = await decideLane(email, rule)
  console.log(`[Lane Orchestrator] Selected lane: ${decision.lane} (reason: ${decision.reason})`)

  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = [
    {
      step: "lane_decision",
      timestamp: new Date(),
      data: decision
    }
  ]

  // Route to appropriate lane
  switch (decision.lane) {
    case "lane1_attachments": {
      console.log("[Lane Orchestrator] Processing via Lane 1: Attachments")
      const result = await processAttachments(email, rule)
      return {
        success: result.success,
        pdfBuffers: result.pdfBuffers,
        lane: "lane1_attachments",
        requiresEscalation: false,
        error: result.error,
        trace: [...trace, ...(result.trace || [])]
      }
    }

    case "lane2_direct": {
      console.log("[Lane Orchestrator] Processing via Lane 2: Direct Download")
      // Pass AI-identified document links to Lane 2
      const aiIdentifiedLinks = decision.documentLinks?.filter(
        link => link.linkType === "direct_pdf"
      )
      const result = await processDirectLinks(email, rule, aiIdentifiedLinks)

      // Check if escalation is needed (direct download failed, might be interactive portal)
      if (result.requiresEscalation) {
        console.log(
          `[Lane Orchestrator] Lane 2 requires escalation: ${result.escalationReason}`
        )

        // Use AI-identified links for escalation, or extract from email as fallback
        let url: string | undefined
        if (decision.documentLinks && decision.documentLinks.length > 0) {
          url = decision.documentLinks[0].url
        } else {
          // Fallback: extract links from email
          const htmlBody = email.HtmlBody || ""
          const textBody = email.TextBody || ""
          const htmlLinks = htmlBody ? extractLinksFromEmail(htmlBody, true) : []
          const textLinks = textBody ? extractLinksFromEmail(textBody, false) : []
          const allLinks = [...htmlLinks, ...textLinks]
          if (allLinks.length > 0) {
            url = allLinks[0].url
          }
        }

        if (url) {
          console.log(`[Lane Orchestrator] Escalating to Lane 3B (Agentic Browser): ${url}`)
          const lane3bResult = await processAgenticPortal(url, email, rule)

          return {
            success: lane3bResult.success,
            pdfBuffers: lane3bResult.pdfBuffers,
            lane: "lane3_interactive",
            requiresEscalation: !lane3bResult.success,
            escalationReason: lane3bResult.error,
            error: lane3bResult.error,
            trace: [
              ...trace,
              ...(result.trace || []),
              { step: "escalated_to_lane3b", timestamp: new Date() },
              ...(lane3bResult.trace || [])
            ]
          }
        }

        return {
          success: false,
          pdfBuffers: [],
          lane: "lane2_direct",
          requiresEscalation: true,
          escalationReason: result.escalationReason,
          error: result.error,
          trace: [...trace, ...(result.trace || [])]
        }
      }

      return {
        success: result.success,
        pdfBuffers: result.pdfBuffers.map((pdf) => ({
          name: pdf.name,
          content: pdf.content,
          url: pdf.url
        })),
        lane: "lane2_direct",
        requiresEscalation: false,
        error: result.error,
        trace: [...trace, ...(result.trace || [])]
      }
    }

    case "lane3_interactive": {
      console.log("[Lane Orchestrator] Processing via Lane 3: Interactive Portal (Agentic Browser)")

      // Use AI-identified document links from decision matrix
      const interactiveLinks = decision.documentLinks?.filter(
        link => link.linkType === "interactive_portal"
      ) || []

      // Fallback: extract links if AI didn't identify any
      let linksToProcess = interactiveLinks
      if (linksToProcess.length === 0) {
        console.log("[Lane Orchestrator] No AI-identified links, falling back to extracting all links...")
        const htmlBody = email.HtmlBody || ""
        const textBody = email.TextBody || ""
        const htmlLinks = htmlBody ? extractAllLinksFromEmail(htmlBody, true) : []
        const textLinks = textBody ? extractAllLinksFromEmail(textBody, false) : []
        
        // Combine and deduplicate
        const allLinksMap = new Map<string, { url: string; label?: string }>()
        for (const link of [...htmlLinks, ...textLinks]) {
          if (!allLinksMap.has(link.url)) {
            allLinksMap.set(link.url, link)
          }
        }
        linksToProcess = Array.from(allLinksMap.values()).map(link => ({
          url: link.url,
          label: link.label,
          linkType: "interactive_portal" as const
        }))
      }

      console.log(`[Lane Orchestrator] Found ${linksToProcess.length} interactive portal link(s)`)
      if (linksToProcess.length > 0) {
        console.log(`[Lane Orchestrator] Processing first link: ${linksToProcess[0].url.substring(0, 100)}...`)
      }

      if (linksToProcess.length === 0) {
        return {
          success: false,
          pdfBuffers: [],
          lane: "lane3_interactive",
          requiresEscalation: false,
          error: "No links found for interactive portal",
          trace
        }
      }

      const url = linksToProcess[0].url

      // Use Lane 3B (Agentic Browser) directly - no more Lane 3A
      console.log(`[Lane Orchestrator] Processing with Agentic Browser (Lane 3B): ${url}`)
      const lane3bResult = await processAgenticPortal(url, email, rule)

      return {
        success: lane3bResult.success,
        pdfBuffers: lane3bResult.pdfBuffers,
        lane: "lane3_interactive",
        requiresEscalation: !lane3bResult.success,
        escalationReason: lane3bResult.error,
        error: lane3bResult.error,
        trace: [...trace, ...(lane3bResult.trace || [])]
      }
    }

    default: {
      return {
        success: false,
        pdfBuffers: [],
        lane: "unknown",
        requiresEscalation: false,
        error: "Unknown lane or no attachments/links found",
        trace
      }
    }
  }
}

