/**
 * Guardrails for agentic browser operations
 */

export interface AgenticGuardrails {
  maxSteps: number
  maxTime: number // seconds
  allowedDomains: string[]
}

export const DEFAULT_GUARDRAILS: AgenticGuardrails = {
  maxSteps: parseInt(process.env.AGENTIC_MAX_STEPS || "50", 10),
  maxTime: parseInt(process.env.AGENTIC_MAX_TIME || "120", 10),
  allowedDomains: process.env.AGENTIC_ALLOWED_DOMAINS
    ? process.env.AGENTIC_ALLOWED_DOMAINS.split(",").map((d) => d.trim())
    : []
}

/**
 * Check if a URL is allowed based on guardrails
 */
export function isUrlAllowed(url: string, guardrails: AgenticGuardrails): boolean {
  if (guardrails.allowedDomains.length === 0) {
    return true // No restrictions
  }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    return guardrails.allowedDomains.some((domain) => {
      const domainLower = domain.toLowerCase()
      return hostname === domainLower || hostname.endsWith(`.${domainLower}`)
    })
  } catch {
    return false // Invalid URL
  }
}

