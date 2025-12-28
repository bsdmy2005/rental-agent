/**
 * Detect if HTML content requires user interaction (PIN, login, button click)
 */

export interface InteractionDetectionResult {
  requiresInteraction: boolean
  interactionType?: "pin" | "login" | "button" | "form"
  confidence: number
  selectors?: {
    pinInput?: string[]
    submitButton?: string[]
    form?: string[]
  }
}

/**
 * Detect if HTML requires user interaction
 */
export function detectHtmlInteraction(html: string): InteractionDetectionResult {
  if (!html || html.trim().length === 0) {
    return {
      requiresInteraction: false,
      confidence: 1.0
    }
  }

  const lowerHtml = html.toLowerCase()

  // Check for PIN input fields
  const pinIndicators = [
    /pin/i,
    /6[\s-]?digit/i,
    /access[\s-]?code/i,
    /enter[\s-]?code/i,
    /security[\s-]?code/i
  ]

  const hasPinIndicators = pinIndicators.some((pattern) => pattern.test(html))
  const hasPinInput =
    /<input[^>]*(?:type=["']?text["']?|type=["']?password["']?)[^>]*>/i.test(html) &&
    hasPinIndicators

  // Check for login forms
  const hasLoginForm =
    /<form[^>]*>/i.test(html) &&
    (lowerHtml.includes("login") ||
      lowerHtml.includes("sign in") ||
      lowerHtml.includes("username") ||
      lowerHtml.includes("password"))

  // Check for submit buttons
  const hasSubmitButton =
    /<button[^>]*type=["']?submit["']?[^>]*>/i.test(html) ||
    /<input[^>]*type=["']?submit["']?[^>]*>/i.test(html)

  // Check for download/view buttons that might require interaction first
  const hasActionButtons =
    /<button[^>]*>.*?(?:download|view|print|open|access)/i.test(html) ||
    /<a[^>]*>.*?(?:download|view|print|open|access)/i.test(html)

  // Extract potential selectors
  const pinInputSelectors: string[] = []
  const submitButtonSelectors: string[] = []

  if (hasPinInput) {
    // Try to find PIN input fields
    const inputMatches = html.matchAll(/<input[^>]*>/gi)
    for (const match of inputMatches) {
      const inputHtml = match[0]
      if (
        (inputHtml.includes("pin") ||
          inputHtml.includes("code") ||
          inputHtml.includes("password")) &&
        (inputHtml.includes('type="text"') || inputHtml.includes('type="password"'))
      ) {
        // Try to extract id or name
        const idMatch = inputHtml.match(/id=["']([^"']+)["']/i)
        const nameMatch = inputHtml.match(/name=["']([^"']+)["']/i)
        if (idMatch) pinInputSelectors.push(`#${idMatch[1]}`)
        if (nameMatch) pinInputSelectors.push(`[name="${nameMatch[1]}"]`)
      }
    }
  }

  if (hasSubmitButton) {
    // Try to find submit buttons
    const buttonMatches = html.matchAll(/<(?:button|input)[^>]*>/gi)
    for (const match of buttonMatches) {
      const buttonHtml = match[0]
      if (
        buttonHtml.includes('type="submit"') ||
        buttonHtml.toLowerCase().includes("submit") ||
        buttonHtml.toLowerCase().includes("continue") ||
        buttonHtml.toLowerCase().includes("view")
      ) {
        const idMatch = buttonHtml.match(/id=["']([^"']+)["']/i)
        const classMatch = buttonHtml.match(/class=["']([^"']+)["']/i)
        if (idMatch) submitButtonSelectors.push(`#${idMatch[1]}`)
        if (classMatch) submitButtonSelectors.push(`.${classMatch[1].split(" ")[0]}`)
      }
    }
  }

  // Determine interaction type
  let interactionType: "pin" | "login" | "button" | "form" | undefined
  let confidence = 0.5

  if (hasPinInput) {
    interactionType = "pin"
    confidence = 0.9
  } else if (hasLoginForm) {
    interactionType = "login"
    confidence = 0.8
  } else if (hasSubmitButton || hasActionButtons) {
    interactionType = "button"
    confidence = 0.7
  } else if (/<form[^>]*>/i.test(html)) {
    interactionType = "form"
    confidence = 0.6
  }

  const requiresInteraction = hasPinInput || hasLoginForm || (hasSubmitButton && hasActionButtons)

  return {
    requiresInteraction,
    interactionType,
    confidence,
    selectors:
      pinInputSelectors.length > 0 || submitButtonSelectors.length > 0
        ? {
            pinInput: pinInputSelectors.length > 0 ? pinInputSelectors : undefined,
            submitButton: submitButtonSelectors.length > 0 ? submitButtonSelectors : undefined
          }
        : undefined
  }
}

