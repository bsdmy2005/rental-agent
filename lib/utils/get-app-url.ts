/**
 * Get the application base URL for external links
 * Uses environment variables with sensible fallbacks
 */
export function getAppUrl(): string {
  // Check for explicit app URL first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  
  // Fallback to Vercel URL (for Vercel deployments)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  
  // Fallback to Render URL (for Render deployments)
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL
  }
  
  // Development fallback
  return "http://localhost:3000"
}

/**
 * Get WhatsApp server URL
 */
export function getWhatsAppServerUrl(): string {
  return process.env.WHATSAPP_SERVER_URL || "http://localhost:3001"
}

