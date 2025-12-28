import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface PinExtractionResult {
  pin: string
  confidence: number
  method: "ai" | "pattern"
  reason?: string
}

/**
 * Extract PIN from email content using AI-first approach with pattern fallback
 * Prioritizes AI understanding of email context over rigid pattern matching
 */
export async function extractPinFromEmail(
  emailBody: string,
  emailSubject?: string,
  pattern?: string
): Promise<PinExtractionResult | null> {
  console.log("[PIN Extractor] Extracting PIN from email (AI-first approach)...")

  // Use AI first to understand context - it can read instructions in the email
  try {
    console.log("[PIN Extractor] Using AI to extract PIN with full email context...")
    const fullEmailContext = emailSubject
      ? `Subject: ${emailSubject}\n\n${emailBody}`
      : emailBody

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are extracting a PIN or access code from an email that contains instructions for accessing a secure statement or invoice portal. The email may contain explicit instructions about which PIN to use. Read the email carefully and extract the PIN that should be used to access the portal. The PIN is typically 4-8 digits. Return the PIN number and a brief explanation of why you chose it."
        },
        {
          role: "user",
          content: `Extract the PIN or access code from this email. The email may contain instructions about which PIN to use. Pay attention to context clues like "use PIN", "enter PIN", "your PIN is", etc. Return JSON with "pin" (digits only) and "reason" (brief explanation).\n\nEmail:\n${fullEmailContext.substring(0, 4000)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2 // Slightly higher for better understanding
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from AI")
    }

    const result = JSON.parse(content) as { pin?: string | null; reason?: string }
    if (result.pin && /^\d{4,8}$/.test(result.pin)) {
      console.log(`[PIN Extractor] ✓ Found PIN using AI: ${result.pin}`)
      if (result.reason) {
        console.log(`[PIN Extractor]   Reason: ${result.reason}`)
      }
      return {
        pin: result.pin,
        confidence: 0.9, // Higher confidence for AI understanding
        method: "ai",
        reason: result.reason
      }
    }
  } catch (error) {
    console.error("[PIN Extractor] ✗ AI extraction failed, falling back to patterns:", error)
  }

  // Fallback to pattern matching if AI fails
  if (pattern) {
    try {
      const regex = new RegExp(pattern, "i")
      const match = emailBody.match(regex)
      if (match && match[1]) {
        console.log(`[PIN Extractor] ✓ Found PIN using custom pattern: ${match[1]}`)
        return {
          pin: match[1],
          confidence: 0.8,
          method: "pattern"
        }
      }
    } catch (error) {
      console.warn("[PIN Extractor] ⚠ Invalid regex pattern:", error)
    }
  }

  // Try common patterns as last resort
  const commonPatterns = [
    /(?:PIN|pin|Pin)[\s:]*[:\-]?[\s]*(\d{4,8})/i,
    /(?:6[\s-]?digit[\s-]?PIN|PIN[\s-]?is)[\s:]*[:\-]?[\s]*(\d{4,8})/i,
    /(?:enter|use|your)[\s]+(?:PIN|pin)[\s:]*[:\-]?[\s]*(\d{4,8})/i,
    /(?:code|password)[\s:]*[:\-]?[\s]*(\d{4,8})/i
  ]

  for (const pattern of commonPatterns) {
    const match = emailBody.match(pattern)
    if (match && match[1]) {
      console.log(`[PIN Extractor] ⚠ Found PIN using pattern (low confidence): ${match[1]}`)
      return {
        pin: match[1],
        confidence: 0.6, // Lower confidence for pattern matching
        method: "pattern"
      }
    }
  }

  console.warn("[PIN Extractor] ⚠ No PIN found in email")
  return null
}
