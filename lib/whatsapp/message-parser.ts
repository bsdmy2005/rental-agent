/**
 * WhatsApp message parser for extracting incident details
 * Supports multiple message formats
 */

export interface ParsedIncidentMessage {
  propertyCode?: string
  title?: string
  description?: string
  priority?: "low" | "medium" | "high" | "urgent"
}

/**
 * Parse incident message from WhatsApp
 * Supports multiple formats:
 * 1. "PROP-ABC123\nTitle: Leak\nDescription: Water leaking from ceiling"
 * 2. "Property: PROP-ABC123\nIssue: Broken window\nDetails: ..."
 * 3. Simple text: "PROP-ABC123\nWater leaking from ceiling"
 */
export function parseIncidentMessage(messageText: string): ParsedIncidentMessage {
  const result: ParsedIncidentMessage = {}
  const lines = messageText.split("\n").map(line => line.trim()).filter(line => line.length > 0)

  // Extract property code (format: PROP-XXXXXX)
  const propertyCodeMatch = messageText.match(/\bPROP-[A-Z0-9]{6}\b/i)
  if (propertyCodeMatch) {
    result.propertyCode = propertyCodeMatch[0].toUpperCase()
  }

  // Try structured format first
  for (const line of lines) {
    const lowerLine = line.toLowerCase()

    // Title
    if (lowerLine.startsWith("title:")) {
      result.title = line.substring(6).trim()
      continue
    }

    // Description
    if (lowerLine.startsWith("description:") || lowerLine.startsWith("details:")) {
      result.description = line.substring(lowerLine.indexOf(":") + 1).trim()
      continue
    }

    // Issue (alternative to title)
    if (lowerLine.startsWith("issue:")) {
      result.title = line.substring(6).trim()
      continue
    }

    // Priority
    if (lowerLine.startsWith("priority:")) {
      const priorityValue = line.substring(9).trim().toLowerCase()
      if (["low", "medium", "high", "urgent"].includes(priorityValue)) {
        result.priority = priorityValue as "low" | "medium" | "high" | "urgent"
      }
      continue
    }

    // Property (alternative format)
    if (lowerLine.startsWith("property:")) {
      const propertyValue = line.substring(9).trim()
      // Check if it's a property code
      if (propertyValue.match(/^PROP-[A-Z0-9]{6}$/i)) {
        result.propertyCode = propertyValue.toUpperCase()
      }
      continue
    }
  }

  // If no structured format found, try simple format
  // Assume first line after property code is title, rest is description
  if (!result.title && !result.description && lines.length > 0) {
    // Skip property code line if present
    const contentLines = lines.filter(line => !line.match(/^PROP-[A-Z0-9]{6}$/i) && !line.toLowerCase().startsWith("property:"))

    if (contentLines.length > 0) {
      // First non-code line is title
      result.title = contentLines[0]

      // Rest is description
      if (contentLines.length > 1) {
        result.description = contentLines.slice(1).join("\n")
      } else {
        // If only one line, use it as description
        result.description = contentLines[0]
        result.title = undefined
      }
    }
  }

  // If still no description, use entire message (excluding property code)
  if (!result.description && messageText) {
    const withoutCode = messageText.replace(/\bPROP-[A-Z0-9]{6}\b/gi, "").trim()
    if (withoutCode && withoutCode !== messageText) {
      result.description = withoutCode
    } else if (!result.title) {
      // If no property code found, use entire message as description
      result.description = messageText
    }
  }

  // Default priority if not specified
  if (!result.priority) {
    result.priority = "medium"
  }

  return result
}

/**
 * Extract property code from message
 */
export function extractPropertyCode(messageText: string): string | null {
  const match = messageText.match(/\bPROP-[A-Z0-9]{6}\b/i)
  return match ? match[0].toUpperCase() : null
}

/**
 * Check if message looks like an incident report
 */
export function isIncidentMessage(messageText: string): boolean {
  const lowerText = messageText.toLowerCase()
  
  // Check for property code
  if (/\bPROP-[A-Z0-9]{6}\b/i.test(messageText)) {
    return true
  }

  // Check for incident keywords
  const incidentKeywords = [
    "broken", "leak", "leaking", "damage", "issue", "problem",
    "repair", "fix", "maintenance", "urgent", "emergency"
  ]

  return incidentKeywords.some(keyword => lowerText.includes(keyword))
}

