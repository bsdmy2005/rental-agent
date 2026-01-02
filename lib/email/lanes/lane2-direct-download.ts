"use server"

import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { extractLinksFromEmail } from "@/lib/email/link-extractor"
import { downloadPDFFromUrl, checkUrlAccessibility } from "@/lib/storage/url-downloader"
import { detectHtmlInteraction } from "@/lib/email/html-interaction-detector"

export interface ExtractionResult {
  success: boolean
  pdfBuffers: Array<{ name: string; content: Buffer; url: string }>
  requiresEscalation: boolean
  escalationReason?: string
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Lane 2: Process direct download links (non-browser)
 */
export async function processDirectLinks(
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule,
  aiIdentifiedLinks?: Array<{ url: string; label?: string; linkType: "direct_pdf" | "interactive_portal" }>
): Promise<ExtractionResult> {
  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = []
  const startTime = new Date()

  console.log("[Lane 2] Processing direct download links...")
  trace.push({ step: "start", timestamp: startTime })

  try {
    // Use AI-identified links if provided, otherwise extract from email
    let allLinks: Array<{ url: string; label?: string }> = []
    
    if (aiIdentifiedLinks && aiIdentifiedLinks.length > 0) {
      // Filter to only direct PDF links
      const directPdfLinks = aiIdentifiedLinks.filter(link => link.linkType === "direct_pdf")
      console.log(`[Lane 2] Using ${directPdfLinks.length} AI-identified direct PDF link(s)`)
      allLinks = directPdfLinks.map(link => ({ url: link.url, label: link.label }))
    }
    
    // Fallback: extract links from email if no AI-identified links
    if (allLinks.length === 0) {
      console.log("[Lane 2] No AI-identified links, extracting links from email...")
      const htmlBody = email.HtmlBody || ""
      const textBody = email.TextBody || ""
      const htmlLinks = htmlBody ? extractLinksFromEmail(htmlBody, true) : []
      const textLinks = textBody ? extractLinksFromEmail(textBody, false) : []

      // Combine and deduplicate
      const allLinksMap = new Map<string, { url: string; label?: string }>()
      for (const link of [...htmlLinks, ...textLinks]) {
        if (!allLinksMap.has(link.url)) {
          allLinksMap.set(link.url, link)
        }
      }
      allLinks = Array.from(allLinksMap.values())
    }

    trace.push({
      step: "links_extracted",
      timestamp: new Date(),
      data: { linkCount: allLinks.length }
    })

    if (allLinks.length === 0) {
      return {
        success: false,
        pdfBuffers: [],
        requiresEscalation: false,
        error: "No links found in email",
        trace
      }
    }

    console.log(`[Lane 2] Found ${allLinks.length} link(s)`)

    const pdfBuffers: Array<{ name: string; content: Buffer; url: string }> = []
    const lane2Config = (rule.lane2Config as
      | { followRedirects?: boolean; maxRedirects?: number }
      | null) || { followRedirects: true, maxRedirects: 5 }

    // Try to download from each link
    for (const link of allLinks) {
      try {
        console.log(`[Lane 2] Checking link: ${link.url.substring(0, 100)}...`)

        // First, check if URL is accessible and get content type
        const accessibility = await checkUrlAccessibility(link.url)
        trace.push({
          step: "url_checked",
          timestamp: new Date(),
          data: {
            url: link.url,
            accessible: accessibility.accessible,
            contentType: accessibility.contentType
          }
        })

        if (!accessibility.accessible) {
          console.warn(`[Lane 2] ⚠ URL not accessible: ${link.url}`)
          continue
        }

        // If content type indicates HTML, check if it requires interaction
        if (accessibility.contentType?.includes("text/html")) {
          console.log(`[Lane 2] URL returns HTML, checking for interaction requirements...`)

          // Fetch HTML to analyze
          const response = await fetch(link.url, {
            method: "GET",
            headers: {
              "User-Agent": "PropNxtAI/1.0",
              Accept: "text/html"
            },
            redirect: lane2Config.followRedirects ? "follow" : "manual"
          })

          if (response.ok) {
            const html = await response.text()
            const interaction = detectHtmlInteraction(html)

            trace.push({
              step: "interaction_detected",
              timestamp: new Date(),
              data: {
                url: link.url,
                requiresInteraction: interaction.requiresInteraction,
                interactionType: interaction.interactionType,
                confidence: interaction.confidence
              }
            })

            if (interaction.requiresInteraction) {
              console.log(
                `[Lane 2] ⚠ URL requires interaction (${interaction.interactionType}), escalating to Lane 3`
              )
              return {
                success: false,
                pdfBuffers: [],
                requiresEscalation: true,
                escalationReason: `HTML requires ${interaction.interactionType} interaction`,
                trace
              }
            }
          }
        }

        // Try to download as PDF
        try {
          const pdfBuffer = await downloadPDFFromUrl(link.url)
          const fileName =
            link.label && link.label.toLowerCase().endsWith(".pdf")
              ? link.label
              : `downloaded-${Date.now()}.pdf`

          pdfBuffers.push({
            name: fileName,
            content: pdfBuffer,
            url: link.url
          })

          trace.push({
            step: "pdf_downloaded",
            timestamp: new Date(),
            data: { url: link.url, fileName, size: pdfBuffer.length }
          })

          console.log(`[Lane 2] ✓ Downloaded PDF from ${link.url} (${pdfBuffer.length} bytes)`)
        } catch (downloadError) {
          console.warn(`[Lane 2] ⚠ Failed to download PDF from ${link.url}:`, downloadError)
          // Continue with other links
        }
      } catch (error) {
        console.error(`[Lane 2] ✗ Error processing link ${link.url}:`, error)
        // Continue with other links
      }
    }

    if (pdfBuffers.length === 0) {
      return {
        success: false,
        pdfBuffers: [],
        requiresEscalation: false,
        error: "No PDFs could be downloaded from links",
        trace
      }
    }

    trace.push({
      step: "complete",
      timestamp: new Date(),
      data: { pdfCount: pdfBuffers.length }
    })

    console.log(`[Lane 2] ✓ Successfully downloaded ${pdfBuffers.length} PDF(s)`)
    return {
      success: true,
      pdfBuffers,
      requiresEscalation: false,
      trace
    }
  } catch (error) {
    console.error("[Lane 2] ✗ Error processing direct links:", error)
    trace.push({
      step: "error",
      timestamp: new Date(),
      data: { error: error instanceof Error ? error.message : "Unknown error" }
    })
    return {
      success: false,
      pdfBuffers: [],
      requiresEscalation: false,
      error: error instanceof Error ? error.message : "Unknown error",
      trace
    }
  }
}

