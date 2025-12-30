"use server"

import OpenAI from "openai"
import { ActionState } from "@/types"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface TransformedRfqData {
  title: string
  description: string
}

/**
 * Transform casual incident description to professional RFQ description
 * Converts tenant's casual language to professional service request language
 */
export async function transformIncidentToRfqDescriptionAction(
  incidentTitle: string,
  incidentDescription: string,
  propertyDetails: { name: string; address: string }
): Promise<ActionState<TransformedRfqData>> {
  try {
    console.log("[RFQ Transformer] Starting transformation...")
    console.log("[RFQ Transformer] OpenAI API key configured:", !!process.env.OPENAI_API_KEY)
    
    // Fallback if OpenAI API key is not configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[RFQ Transformer] OpenAI API key not configured, using original text")
      return {
        isSuccess: true,
        message: "Using original text (OpenAI not configured)",
        data: {
          title: incidentTitle,
          description: incidentDescription
        }
      }
    }

    const systemPrompt = `You are an expert at converting tenant incident reports to professional service requests for service providers.

Your task is to transform casual, informal incident descriptions into clear, professional RFQ (Request for Quote) descriptions that service providers can understand and act upon.

Guidelines:
- Convert casual language ("I have a leak", "the tap is broken") to professional terminology ("Water leak requiring plumbing repair", "Faulty tap requiring replacement")
- Maintain ALL important details from the original description
- Use appropriate technical terminology that service providers understand
- Structure the description for clarity and actionability
- Keep the tone professional, clear, and concise
- Preserve any specific location details, urgency indicators, or special requirements
- Do not add information that wasn't in the original description
- Do not remove any important details

The transformed text should be suitable for sending to professional service providers who need to understand the work required and provide accurate quotes.`

    const userPrompt = `Property: ${propertyDetails.name}
Address: ${propertyDetails.address}

Original Incident Title: "${incidentTitle}"

Original Incident Description:
"${incidentDescription}"

Please transform this into a professional RFQ title and description suitable for service providers. Return your response as a JSON object with "title" and "description" fields.`

    console.log("[RFQ Transformer] Calling OpenAI API...")
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })
    console.log("[RFQ Transformer] OpenAI API response received")

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.warn("[RFQ Transformer] No response from AI, using original text")
      return {
        isSuccess: true,
        message: "Using original text (no AI response)",
        data: {
          title: incidentTitle,
          description: incidentDescription
        }
      }
    }

    try {
      const result = JSON.parse(content) as TransformedRfqData
      
      // Validate that we got title and description
      if (!result.title || !result.description) {
        console.warn("[RFQ Transformer] Invalid AI response structure, using original text")
        return {
          isSuccess: true,
          message: "Using original text (invalid AI response)",
          data: {
            title: incidentTitle,
            description: incidentDescription
          }
        }
      }

      return {
        isSuccess: true,
        message: "Text transformed successfully",
        data: {
          title: result.title,
          description: result.description
        }
      }
    } catch (parseError) {
      console.error("[RFQ Transformer] Error parsing AI response:", parseError, content)
      return {
        isSuccess: true,
        message: "Using original text (parse error)",
        data: {
          title: incidentTitle,
          description: incidentDescription
        }
      }
    }
  } catch (error) {
    console.error("[RFQ Transformer] Error transforming text:", error)
    // Always return success with original text as fallback
    return {
      isSuccess: true,
      message: "Using original text (transformation error)",
      data: {
        title: incidentTitle,
        description: incidentDescription
      }
    }
  }
}

