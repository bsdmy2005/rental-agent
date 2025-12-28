import OpenAI from "openai"
import { config } from "dotenv"
import { resolve } from "path"
import type { SelectExtractionRule } from "@/db/schema"
import type { EmailInfo } from "./email-info-extractor"

// Load environment variables
if (typeof window === "undefined") {
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Generate concise, optimized instruction for Browser Use agent
 * Takes extracted email info and creates a clean task description
 * that minimizes token usage while providing all necessary context
 */
export async function generateBrowserUseInstruction(
  emailInfo: EmailInfo,
  url: string,
  rule: SelectExtractionRule
): Promise<string> {
  console.log("[Instruction Generator] Generating concise Browser Use instruction...")

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

  // Extract PIN from portal context if specified (takes priority)
  let portalContextPin: string | undefined = undefined
  if (portalContext) {
    const pinMatch = portalContext.match(/(?:PIN|pin)[\s:]*[:\-]?[\s]*(\d{4,8})/i)
    if (pinMatch && pinMatch[1]) {
      portalContextPin = pinMatch[1]
      console.log(`[Instruction Generator] Found PIN in portal context: ${portalContextPin.substring(0, 2)}****`)
    }
  }

  // Build concise context from extracted info
  const contextParts: string[] = []

  if (emailInfo.context) {
    contextParts.push(`Context: ${emailInfo.context}`)
  }

  if (emailInfo.documentType) {
    contextParts.push(`Document Type: ${emailInfo.documentType}`)
  }

  if (emailInfo.credentials) {
    const creds: string[] = []
    // Use portal context PIN if available, otherwise use extracted PIN
    const pinToUse = portalContextPin || emailInfo.credentials.pin
    if (pinToUse) {
      creds.push(`PIN: ${pinToUse}`)
      if (portalContextPin) {
        console.log(`[Instruction Generator] Using portal context PIN (overriding email PIN)`)
      }
    }
    if (emailInfo.credentials.accessCode) {
      creds.push(`Access Code: ${emailInfo.credentials.accessCode}`)
    }
    if (emailInfo.credentials.username) {
      creds.push(`Username: ${emailInfo.credentials.username}`)
    }
    if (creds.length > 0) {
      contextParts.push(`Credentials: ${creds.join(", ")}`)
    }
  }

  if (emailInfo.instructions && emailInfo.instructions.length > 0) {
    contextParts.push(`Steps: ${emailInfo.instructions.join("; ")}`)
  }

  if (emailInfo.specialSteps && emailInfo.specialSteps.length > 0) {
    contextParts.push(`Special: ${emailInfo.specialSteps.join("; ")}`)
  }

  if (emailInfo.portalDescription) {
    contextParts.push(`Portal: ${emailInfo.portalDescription}`)
  }

  const extractedContext = contextParts.join(". ")

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are creating a concise, actionable instruction for a browser automation agent (Browser Use). The instruction should be clear, specific, and optimized for token efficiency. Include only essential information needed to complete the task. Format it as a natural task description that a browser agent can follow. IMPORTANT: If portal context is provided, prioritize it over extracted email information."
        },
        {
          role: "user",
          content: `Create a concise instruction for a browser agent to:
1. Navigate to ${url}
2. Access the portal using the provided credentials
3. Download the document

${portalContext ? `PORTAL CONTEXT (PRIORITY - Use this information):\n${portalContext}\n\n` : ""}Extracted Information from Email:
${extractedContext}

${ruleInstruction ? `Additional Rule Instructions: ${ruleInstruction}` : ""}

${portalContext ? "IMPORTANT: The portal context above takes priority. Use it to guide the browser agent on how to interact with the portal." : ""}

Generate a single, clear instruction (2-4 sentences max) that tells the browser agent exactly what to do. Be specific about credentials and steps, but concise. Do not include the raw email content.`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    })

    const instruction = response.choices[0]?.message?.content?.trim()
    if (instruction) {
      console.log(`[Instruction Generator] ✓ Generated instruction (${instruction.length} chars)`)
      return instruction
    }
  } catch (error) {
    console.error("[Instruction Generator] ✗ Failed to generate instruction:", error)
  }

  // Fallback: Create simple instruction from extracted info
  const fallbackParts: string[] = [`Navigate to ${url}`]

  // Use portal context PIN if available, otherwise use extracted PIN
  const pinToUse = portalContextPin || emailInfo.credentials?.pin
  if (pinToUse) {
    fallbackParts.push(`enter PIN ${pinToUse}`)
  } else if (emailInfo.credentials?.accessCode) {
    fallbackParts.push(`enter access code ${emailInfo.credentials.accessCode}`)
  }

  if (emailInfo.documentType) {
    fallbackParts.push(`download the ${emailInfo.documentType} PDF`)
  } else {
    fallbackParts.push("download the statement PDF")
  }

  const fallbackInstruction = fallbackParts.join(", ") + "."
  console.log(`[Instruction Generator] Using fallback instruction: ${fallbackInstruction}`)
  return fallbackInstruction
}

