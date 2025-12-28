"use server"

import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { extractPinFromEmail } from "@/lib/email/pin-extractor"
import { automateBrowserInteraction, type PlaywrightConfig } from "@/lib/email/browser-automation"

export interface ExtractionResult {
  success: boolean
  pdfBuffers: Array<{ name: string; content: Buffer; url: string }>
  requiresEscalation: boolean
  escalationReason?: string
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Lane 3A: Process interactive portal using Playwright (deterministic)
 */
export async function processInteractivePortal(
  url: string,
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule
): Promise<ExtractionResult> {
  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = []
  const startTime = new Date()

  console.log(`[Lane 3A] Processing interactive portal: ${url}`)
  trace.push({ step: "start", timestamp: startTime })

  try {
    // Extract PIN from email using AI-first approach
    trace.push({ step: "pin_extraction_start", timestamp: new Date() })
    const emailBody = email.HtmlBody || email.TextBody || ""
    const emailSubject = email.Subject || ""
    const pinResult = await extractPinFromEmail(emailBody, emailSubject)

    if (!pinResult) {
      return {
        success: false,
        pdfBuffers: [],
        requiresEscalation: true,
        escalationReason: "PIN not found in email",
        error: "Could not extract PIN from email",
        trace
      }
    }

    trace.push({
      step: "pin_extracted",
      timestamp: new Date(),
      data: {
        pin: pinResult.pin.substring(0, 2) + "****", // Mask PIN in trace
        method: pinResult.method,
        confidence: pinResult.confidence
      }
    })

    console.log(`[Lane 3A] ✓ Extracted PIN using ${pinResult.method} (confidence: ${pinResult.confidence})`)

    // Get Playwright configuration from rule
    const lane3Config = (rule.lane3Config as
      | {
          method?: string
          playwrightConfig?: PlaywrightConfig
        }
      | null) || {}

    const playwrightConfig: PlaywrightConfig =
      lane3Config.playwrightConfig || {}

    // Default selectors if not provided (try common patterns)
    if (!playwrightConfig.pinInputSelector) {
      // Try common PIN input selectors
      playwrightConfig.pinInputSelector =
        'input[type="text"][name*="pin" i], input[type="text"][id*="pin" i], input[type="password"][name*="pin" i], input[name*="code" i]'
    }

    if (!playwrightConfig.submitButtonSelector) {
      playwrightConfig.submitButtonSelector =
        'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("View"), button:has-text("Continue")'
    }

    if (!playwrightConfig.pdfDownloadSelector) {
      playwrightConfig.pdfDownloadSelector =
        'a:has-text("Download"), a:has-text("PDF"), button:has-text("Download"), button:has-text("Print")'
    }

    trace.push({
      step: "browser_automation_start",
      timestamp: new Date(),
      data: { url, config: playwrightConfig }
    })

    // Run browser automation
    const automationResult = await automateBrowserInteraction(
      url,
      pinResult.pin,
      playwrightConfig
    )

    if (!automationResult.success || !automationResult.pdfBuffer) {
      return {
        success: false,
        pdfBuffers: [],
        requiresEscalation: true,
        escalationReason: automationResult.error || "Browser automation failed",
        error: automationResult.error,
        trace: [...trace, ...(automationResult.trace || [])]
      }
    }

    trace.push({
      step: "complete",
      timestamp: new Date(),
      data: { pdfSize: automationResult.pdfBuffer.length }
    })

    console.log(`[Lane 3A] ✓ Successfully extracted PDF (${automationResult.pdfBuffer.length} bytes)`)

    return {
      success: true,
      pdfBuffers: [
        {
          name: `statement-${Date.now()}.pdf`,
          content: automationResult.pdfBuffer,
          url
        }
      ],
      requiresEscalation: false,
      trace: [...trace, ...(automationResult.trace || [])]
    }
  } catch (error) {
    console.error("[Lane 3A] ✗ Error processing interactive portal:", error)
    trace.push({
      step: "error",
      timestamp: new Date(),
      data: { error: error instanceof Error ? error.message : "Unknown error" }
    })
    return {
      success: false,
      pdfBuffers: [],
      requiresEscalation: true,
      escalationReason: error instanceof Error ? error.message : "Unknown error",
      error: error instanceof Error ? error.message : "Unknown error",
      trace
    }
  }
}

