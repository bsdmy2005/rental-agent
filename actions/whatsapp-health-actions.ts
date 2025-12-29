"use server"

import { ActionState } from "@/types"

/**
 * Lightweight health status response from WhatsApp server
 * Used for frequent polling to show connection indicators
 */
export interface HealthStatus {
  status: "ok" | "degraded" | "error"
  timestamp: string
  uptime: number
  sessions: {
    total: number
    connected: number
    connecting: number
    disconnected: number
  }
}

/**
 * Deep health status with detailed session and database information
 * Used for less frequent health checks with full diagnostics
 */
export interface DeepHealthStatus {
  status: "ok" | "degraded" | "error"
  timestamp: string
  uptime: number
  database: {
    connected: boolean
    latencyMs: number
  }
  sessions: Array<{
    sessionId: string
    phoneNumber: string | null
    connectionStatus: string
    lastConnectedAt: string | null
    lastMessageAt: string | null
    socketAlive: boolean
  }>
}

/**
 * Get lightweight health status from WhatsApp server
 * No authentication required - designed for frequent polling
 * Returns success with error status when server is unreachable
 * so UI can gracefully show disconnected state
 *
 * @returns HealthStatus with session counts and server status
 */
export async function getWhatsAppHealthAction(): Promise<
  ActionState<HealthStatus>
> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const serverUrl =
      process.env.WHATSAPP_SERVER_URL || "http://localhost:3001"

    const response = await fetch(`${serverUrl}/health`, {
      cache: "no-store",
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        isSuccess: false,
        message: `Health check failed: ${response.status}`
      }
    }

    const data = (await response.json()) as HealthStatus

    return {
      isSuccess: true,
      message: "Health check successful",
      data
    }
  } catch {
    clearTimeout(timeoutId)
    // Server unreachable - return success with error status
    // This allows UI to show red indicator gracefully without error handling
    return {
      isSuccess: true,
      message: "Server unreachable",
      data: {
        status: "error",
        timestamp: new Date().toISOString(),
        uptime: 0,
        sessions: {
          total: 0,
          connected: 0,
          connecting: 0,
          disconnected: 0
        }
      }
    }
  }
}

/**
 * Get deep health status from WhatsApp server
 * Requires API key authentication - designed for less frequent polling
 * Provides detailed information about database connectivity and individual sessions
 *
 * Note: Unlike getWhatsAppHealthAction, this returns failure on network error
 * because deep health is used for diagnostics where we need to know if
 * the server is truly unreachable vs having issues.
 *
 * @returns DeepHealthStatus with database and session details
 */
export async function getWhatsAppDeepHealthAction(): Promise<
  ActionState<DeepHealthStatus>
> {
  const apiKey = process.env.WHATSAPP_SERVER_API_KEY
  if (!apiKey) {
    return {
      isSuccess: false,
      message: "WHATSAPP_SERVER_API_KEY environment variable is not configured"
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const serverUrl =
      process.env.WHATSAPP_SERVER_URL || "http://localhost:3001"

    const response = await fetch(`${serverUrl}/health/deep`, {
      headers: {
        "x-api-key": apiKey
      },
      cache: "no-store",
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        isSuccess: false,
        message: `Deep health check failed: ${response.status}`
      }
    }

    const data = (await response.json()) as DeepHealthStatus

    return {
      isSuccess: true,
      message: "Deep health check successful",
      data
    }
  } catch (error) {
    clearTimeout(timeoutId)
    return {
      isSuccess: false,
      message:
        error instanceof Error ? error.message : "Deep health check failed"
    }
  }
}

/**
 * Trigger reconnection for a specific WhatsApp session
 * Requires API key authentication
 * Useful for recovering sessions that have become disconnected
 *
 * @param sessionId - The ID of the session to reconnect
 * @returns Success/failure indication
 */
export async function reconnectWhatsAppSessionAction(
  sessionId: string
): Promise<ActionState<void>> {
  const apiKey = process.env.WHATSAPP_SERVER_API_KEY
  if (!apiKey) {
    return {
      isSuccess: false,
      message: "WHATSAPP_SERVER_API_KEY environment variable is not configured"
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const serverUrl =
      process.env.WHATSAPP_SERVER_URL || "http://localhost:3001"

    const response = await fetch(
      `${serverUrl}/sessions/${sessionId}/reconnect`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      }
    )
    clearTimeout(timeoutId)

    if (!response.ok) {
      const data = await response.json()
      return {
        isSuccess: false,
        message: data.error || `Reconnect failed: ${response.status}`
      }
    }

    return {
      isSuccess: true,
      message: "Reconnection initiated",
      data: undefined
    }
  } catch (error) {
    clearTimeout(timeoutId)
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Reconnect failed"
    }
  }
}
