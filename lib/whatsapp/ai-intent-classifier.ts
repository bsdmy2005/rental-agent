"use server"

import OpenAI from "openai"
import { ActionState } from "@/types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface IntentClassificationResult {
  intent: "new_incident" | "follow_up" | "unclear"
  confidence: number
  reasoning: string
  suggestedAction?: "create_new" | "attach_to_existing" | "ask_clarification"
}

/**
 * Classify message intent using AI
 * Determines if a message is a new incident or a follow-up to an existing incident
 */
export async function classifyMessageIntent(
  messageText: string,
  existingIncidents: Array<{ id: string; title: string; description: string; reportedAt: Date }>
): Promise<ActionState<IntentClassificationResult>> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to keyword-based classification if no API key
      return {
        isSuccess: true,
        message: "Using fallback classification",
        data: {
          intent: "unclear",
          confidence: 0.5,
          reasoning: "OpenAI API key not configured, using fallback",
          suggestedAction: "ask_clarification"
        }
      }
    }

    // Build context about existing incidents
    const incidentsContext = existingIncidents.length > 0
      ? existingIncidents
          .map((inc, idx) => {
            const daysAgo = Math.floor(
              (Date.now() - new Date(inc.reportedAt).getTime()) / (1000 * 60 * 60 * 24)
            )
            return `${idx + 1}. ${inc.title} (${inc.description.substring(0, 100)}...) - reported ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`
          })
          .join("\n")
      : "No existing incidents"

    const systemPrompt = `You are an AI assistant that classifies WhatsApp messages for a property management incident reporting system.

Your task is to determine if a message is:
1. A NEW incident report (different issue from existing ones)
2. A FOLLOW-UP to an existing incident (update, additional info, or related to existing issue)
3. UNCLEAR (needs clarification)

Guidelines:
- NEW incidents: Different location, different problem type, or clearly unrelated to existing issues
- FOLLOW-UPS: Updates on existing issues, additional photos, status questions, or clarifications about the same problem
- UNCLEAR: Ambiguous messages that could be either

Respond with JSON only:
{
  "intent": "new_incident" | "follow_up" | "unclear",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "suggestedAction": "create_new" | "attach_to_existing" | "ask_clarification"
}`

    const userPrompt = `Message: "${messageText}"

Existing incidents:
${incidentsContext}

Classify this message.`

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        isSuccess: false,
        message: "No response from AI"
      }
    }

    try {
      const result = JSON.parse(content) as IntentClassificationResult
      return {
        isSuccess: true,
        message: "Intent classified successfully",
        data: result
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content)
      return {
        isSuccess: false,
        message: "Failed to parse AI response"
      }
    }
  } catch (error) {
    console.error("Error classifying message intent:", error)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to classify intent"
    }
  }
}

