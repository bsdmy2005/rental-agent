import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"
import type { PostmarkWebhookPayload } from "@/lib/email/postmark-parser"
import type { SelectExtractionRule } from "@/db/schema"
import { z } from "zod"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Schema for extracted email information
const EmailInfoSchema = z.object({
  credentials: z.object({
    pin: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    accessCode: z.string().optional(),
    other: z.record(z.string(), z.string()).optional()
  }).optional(),
  instructions: z.array(z.string()).optional(),
  documentType: z.string().optional(),
  specialSteps: z.array(z.string()).optional(),
  context: z.string().optional(),
  portalDescription: z.string().optional(),
  reason: z.string().optional() // Explanation for PIN choice
})

export type EmailInfo = z.infer<typeof EmailInfoSchema>

/**
 * Extract structured information from email using OpenAI
 * This local preprocessing step extracts only relevant information
 * to avoid sending raw email content to Browser Use API
 */
export async function extractEmailInfo(
  email: PostmarkWebhookPayload,
  url: string,
  rule: SelectExtractionRule
): Promise<EmailInfo> {
  console.log("[Email Info Extractor] Extracting structured information from email...")

  const emailSubject = email.Subject || ""
  const emailBody = email.HtmlBody || email.TextBody || ""
  const ruleInstruction = rule.emailProcessingInstruction || ""

  // Get portal context from lane3Config (user-provided instructions about portal)
  const lane3Config = (rule.lane3Config as
    | {
        method?: string
        agenticConfig?: {
          maxSteps?: number
          maxTime?: number
          allowedDomains?: string[]
          portalContext?: string
        }
      }
    | null) || {}

  const portalContext = lane3Config.agenticConfig?.portalContext || ""

  // Extract PIN from portal context if specified (takes priority over email extraction)
  let portalContextPin: string | undefined = undefined
  if (portalContext) {
    // Try to extract PIN from portal context (look for patterns like "PIN: 123456" or "use PIN 123456")
    const pinMatch = portalContext.match(/(?:PIN|pin)[\s:]*[:\-]?[\s]*(\d{4,8})/i)
    if (pinMatch && pinMatch[1]) {
      portalContextPin = pinMatch[1]
      console.log(`[Email Info Extractor] Found PIN in portal context: ${portalContextPin.substring(0, 2)}****`)
    }
  }

  // Clean email body for better extraction (remove HTML tags, normalize formatting)
  const cleanEmailBodyForAI = emailBody
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\*+/g, " ") // Remove markdown bold/italic markers
    .replace(/_+/g, " ") // Remove markdown underscores
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()

  // Prepare email content for extraction (limit size for efficiency)
  const emailContent = `
Subject: ${emailSubject}
From: ${email.From || "(unknown)"}

Email Body (cleaned):
${cleanEmailBodyForAI.substring(0, 4000)}

Target URL: ${url}
${ruleInstruction ? `\nRule Instructions: ${ruleInstruction}` : ""}
${portalContext ? `\n\nPortal Context (User-provided instructions about how the portal works):\n${portalContext}` : ""}
`

  // Log email content snippet for debugging (first 500 chars)
  const emailPreview = emailBody.substring(0, 500).replace(/\n/g, " ")
  console.log(`[Email Info Extractor] Email preview: ${emailPreview}...`)

  // Try to find all potential PINs in email for debugging and fallback
  // Remove HTML tags and markdown formatting for better pattern matching
  const cleanEmailBody = emailBody
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\*+/g, " ") // Remove markdown bold/italic markers
    .replace(/_+/g, " ") // Remove markdown underscores
    .replace(/\s+/g, " ") // Normalize whitespace
  
  const pinPatterns = [
    /(?:PIN|pin|Pin)[\s:]*[:\-]?[\s]*(?:this|the)?[\s]*(?:\d+[\s-]?digit[\s-]?)?[\s]*PIN[\s:]*[:\-]?[\s]*(\d{4,8})/gi, // "6-digit PIN: 314827" or "PIN: 314827"
    /(?:enter|use|your|this|the)[\s]+(?:PIN|pin)[\s:]*[:\-]?[\s]*(\d{4,8})/gi, // "enter PIN 314827"
    /(?:PIN|pin)[\s:]*[:\-]?[\s]*(\d{4,8})/gi, // Simple "PIN: 314827"
    /(?:code|password)[\s:]*[:\-]?[\s]*(\d{4,8})/gi, // "code: 314827"
    /(?:to[\s]+(?:open|view|access))[^.]*?PIN[^.]*?(\d{4,8})/gi // "to open your statement...PIN...314827"
  ]
  const foundPins: string[] = []
  for (const pattern of pinPatterns) {
    const matches = cleanEmailBody.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && !foundPins.includes(match[1])) {
        foundPins.push(match[1])
        console.log(`[Email Info Extractor] Pattern matched PIN: ${match[1]} (pattern: ${pattern.source.substring(0, 50)}...)`)
      }
    }
  }
  if (foundPins.length > 0) {
    console.log(`[Email Info Extractor] Found ${foundPins.length} potential PIN(s) via pattern matching: ${foundPins.map(p => p.substring(0, 2) + "****").join(", ")}`)
  } else {
    console.log(`[Email Info Extractor] ⚠ No PINs found via pattern matching`)
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are extracting structured information from an email that contains instructions for accessing a secure portal to download a statement or invoice. Extract only the essential information needed for a browser agent to complete the task. Focus on credentials (PIN, access codes), step-by-step instructions, document type, and any special navigation steps. IMPORTANT: When extracting the PIN, look for the PIN that is specifically mentioned in relation to accessing the portal, viewing the statement, or downloading the document. If multiple PINs are mentioned, prioritize the one that is clearly associated with the portal URL or statement access."
        },
        {
          role: "user",
          content: `Extract structured information from this email. The email contains instructions for accessing a portal at ${url} to download a document.

CRITICAL INSTRUCTIONS FOR PIN EXTRACTION:
- Look for the PIN that is specifically mentioned for accessing THIS portal (${url})
- The PIN is often mentioned in formats like:
  * "6-digit PIN: 314827" or "PIN: 314827"
  * "enter this PIN: 314827" or "use PIN 314827"
  * "to open your statement, you will need to enter this PIN: 314827"
- The PIN should be mentioned near phrases like "to view your statement", "to access the portal", "to download", "enter PIN", "use PIN", "to open your statement", etc.
- If multiple PINs are mentioned, choose the one that is clearly associated with the statement/portal access
- Ignore PINs that are mentioned in unrelated contexts (like account numbers, reference numbers, etc.)
- The PIN is typically 4-8 digits (often 6 digits for statement portals)
- Look for the PIN that appears right before or after the portal URL

Extract:
1. Credentials: PIN (the PIN specifically for accessing this portal/statement), access code, username, password (if mentioned)
2. Instructions: Step-by-step instructions from the email
3. Document Type: Statement, invoice, bill, etc.
4. Special Steps: Any special navigation or actions needed
5. Context: Brief summary of what the email is about
6. Portal Description: Description of what the portal is for

${portalContextPin ? `\nIMPORTANT: Use PIN ${portalContextPin} from portal context (this overrides any PIN found in the email).` : ""}

Email:
${emailContent}

Return JSON with the extracted information. Include a "reason" field explaining why you chose this PIN if multiple PINs were found.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from OpenAI")
    }

    const parsed = JSON.parse(content)
    const emailInfo = EmailInfoSchema.parse(parsed)

    // Override PIN with portal context PIN if specified
    if (portalContextPin) {
      if (!emailInfo.credentials) {
        emailInfo.credentials = {}
      }
      emailInfo.credentials.pin = portalContextPin
      console.log(`[Email Info Extractor] ✓ Overriding PIN with portal context PIN: ${portalContextPin.substring(0, 2)}****`)
    } else if (!emailInfo.credentials?.pin && foundPins.length > 0) {
      // Fallback: Use pattern-matched PIN if AI didn't extract one
      // Prioritize PINs that are 6 digits (common for statement portals)
      const sixDigitPin = foundPins.find(p => p.length === 6)
      const fallbackPin = sixDigitPin || foundPins[0]
      
      if (!emailInfo.credentials) {
        emailInfo.credentials = {}
      }
      emailInfo.credentials.pin = fallbackPin
      console.log(`[Email Info Extractor] ⚠ AI didn't extract PIN, using pattern-matched PIN: ${fallbackPin.substring(0, 2)}**** (${foundPins.length} PIN(s) found via patterns)`)
    }

    console.log(`[Email Info Extractor] ✓ Extracted email info:`)
    if (emailInfo.credentials?.pin) {
      console.log(`[Email Info Extractor]   PIN: ${emailInfo.credentials.pin.substring(0, 2)}**** (full: ${emailInfo.credentials.pin})`)
      if (emailInfo.reason) {
        console.log(`[Email Info Extractor]   PIN Selection Reason: ${emailInfo.reason}`)
      }
    } else {
      console.log(`[Email Info Extractor]   ⚠ No PIN found in email (AI extraction failed and no pattern matches)`)
      if (foundPins.length === 0) {
        console.log(`[Email Info Extractor]   ⚠ Pattern matching also found no PINs - email may not contain a PIN`)
      }
    }
    if (emailInfo.documentType) {
      console.log(`[Email Info Extractor]   Document Type: ${emailInfo.documentType}`)
    }
    if (emailInfo.instructions && emailInfo.instructions.length > 0) {
      console.log(`[Email Info Extractor]   Instructions: ${emailInfo.instructions.length} step(s)`)
    }

    return emailInfo
  } catch (error) {
    console.error("[Email Info Extractor] ✗ Failed to extract email info:", error)
    // Return minimal structure on error
    return {
      context: `Email about accessing portal at ${url}`
    }
  }
}

