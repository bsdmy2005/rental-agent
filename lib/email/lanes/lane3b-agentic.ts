"use server"

import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { generateAgenticGoal } from "@/lib/email/goal-generator"
import { processWithAgenticBrowser } from "@/lib/email/agentic-browser"
import { DEFAULT_GUARDRAILS, isUrlAllowed } from "@/lib/email/agentic-guardrails"

export interface ExtractionResult {
  success: boolean
  pdfBuffers: Array<{ name: string; content: Buffer; url: string }>
  error?: string
  trace?: Array<{ step: string; timestamp: Date; data?: unknown }>
}

/**
 * Lane 3B: Process interactive portal using agentic browser (fallback)
 */
export async function processAgenticPortal(
  url: string,
  email: PostmarkWebhookPayload,
  rule: SelectExtractionRule
): Promise<ExtractionResult> {
  const trace: Array<{ step: string; timestamp: Date; data?: unknown }> = []
  const startTime = new Date()

  console.log(`[Lane 3B] Processing with agentic browser: ${url}`)
  trace.push({ step: "start", timestamp: startTime })

  try {
    // Check URL against guardrails
    const lane3Config = (rule.lane3Config as
      | {
          method?: string
          agenticConfig?: {
            maxSteps?: number
            maxTime?: number
            allowedDomains?: string[]
          }
        }
      | null) || {}

    const agenticConfig = lane3Config.agenticConfig || {}
    const guardrails = {
      maxSteps: agenticConfig.maxSteps || DEFAULT_GUARDRAILS.maxSteps,
      maxTime: agenticConfig.maxTime || DEFAULT_GUARDRAILS.maxTime,
      allowedDomains: agenticConfig.allowedDomains || DEFAULT_GUARDRAILS.allowedDomains
    }

    // Check if URL is allowed
    if (!isUrlAllowed(url, guardrails)) {
      return {
        success: false,
        pdfBuffers: [],
        error: `URL ${url} is not in allowed domains list`,
        trace
      }
    }

    trace.push({
      step: "guardrails_checked",
      timestamp: new Date(),
      data: { guardrails, urlAllowed: true }
    })

    // Generate comprehensive goal with full email context
    // The agentic browser will read the email and determine what inputs are needed
    trace.push({ step: "goal_generation_start", timestamp: new Date() })
    const goal = await generateAgenticGoal(url, email, rule)
    trace.push({
      step: "goal_generated",
      timestamp: new Date(),
      data: { goalLength: goal.length }
    })
    console.log(`[Lane 3B] ✓ Generated AI-powered goal: ${goal.substring(0, 150)}...`)

    trace.push({
      step: "agentic_execution_start",
      timestamp: new Date(),
      data: { goal, guardrails }
    })

    // Execute with agentic browser
    const agenticResult = await processWithAgenticBrowser(url, goal, guardrails)

    if (!agenticResult.success || !agenticResult.pdfBuffer) {
      return {
        success: false,
        pdfBuffers: [],
        error: agenticResult.error || "Agentic browser failed",
        trace: [...trace, ...(agenticResult.trace || [])]
      }
    }

    trace.push({
      step: "complete",
      timestamp: new Date(),
      data: { pdfSize: agenticResult.pdfBuffer.length }
    })

    console.log(`[Lane 3B] ✓ Successfully extracted PDF (${agenticResult.pdfBuffer.length} bytes)`)

    return {
      success: true,
      pdfBuffers: [
        {
          name: `statement-${Date.now()}.pdf`,
          content: agenticResult.pdfBuffer,
          url
        }
      ],
      trace: [...trace, ...(agenticResult.trace || [])]
    }
  } catch (error) {
    console.error("[Lane 3B] ✗ Error processing with agentic browser:", error)
    trace.push({
      step: "error",
      timestamp: new Date(),
      data: { error: error instanceof Error ? error.message : "Unknown error" }
    })
    return {
      success: false,
      pdfBuffers: [],
      error: error instanceof Error ? error.message : "Unknown error",
      trace
    }
  }
}

