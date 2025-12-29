"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from "react"
import {
  getWhatsAppHealthAction,
  getWhatsAppDeepHealthAction,
  reconnectWhatsAppSessionAction,
  type HealthStatus,
  type DeepHealthStatus
} from "@/actions/whatsapp-health-actions"
import { getPrimaryWhatsAppSessionAction } from "@/actions/whatsapp-primary-session-actions"

/**
 * WhatsApp connection status state
 * Provides real-time status information for UI indicators and reconnection
 */
interface WhatsAppStatusState {
  /** Binary status for UI (green/red indicator) */
  status: "connected" | "disconnected"
  /** Whether the WhatsApp server is reachable */
  serverReachable: boolean
  /** Detailed connection status (connected, connecting, disconnected, etc.) */
  connectionStatus: string
  /** Phone number if connected */
  phoneNumber: string | null
  /** Session ID for reconnect functionality */
  sessionId: string | null
  /** Timestamp of last health check */
  lastChecked: Date | null
  /** Last error message if any */
  lastError: string | null
  /** Whether a health check is currently in progress */
  isChecking: boolean
  /** Server uptime in seconds */
  uptime: number
  /** Function to trigger reconnection */
  reconnect: () => Promise<void>
  /** Function to force refresh status */
  refresh: () => Promise<void>
}

const WhatsAppStatusContext = createContext<WhatsAppStatusState | null>(null)

/** Light polling interval - 30 seconds for quick status checks */
const LIGHT_POLL_INTERVAL = 30 * 1000

/** Deep polling interval - 5 minutes for detailed status with session info */
const DEEP_POLL_INTERVAL = 5 * 60 * 1000

/**
 * WhatsApp Status Provider
 *
 * Provides real-time WhatsApp connection status throughout the dashboard.
 * Uses two-tier polling strategy:
 * - Light polls every 30s for quick status updates
 * - Deep polls every 5min for detailed session information
 *
 * Also handles visibility-based polling optimization (pauses when tab not visible).
 *
 * @param children - React children to wrap with context
 * @param userProfileId - The user profile ID to check session for
 */
export function WhatsAppStatusProvider({
  children,
  userProfileId
}: {
  children: React.ReactNode
  userProfileId: string
}) {
  const [state, setState] = useState<
    Omit<WhatsAppStatusState, "reconnect" | "refresh">
  >({
    status: "disconnected",
    serverReachable: false,
    connectionStatus: "unknown",
    phoneNumber: null,
    sessionId: null,
    lastChecked: null,
    lastError: null,
    isChecking: true,
    uptime: 0
  })

  const lightPollRef = useRef<NodeJS.Timeout | null>(null)
  const deepPollRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(true)

  /**
   * Check WhatsApp health status
   *
   * @param deep - If true, performs deep health check with session details
   */
  const checkHealth = useCallback(
    async (deep: boolean = false) => {
      setState(prev => ({ ...prev, isChecking: true }))

      try {
        // Get session ID first
        const sessionResult =
          await getPrimaryWhatsAppSessionAction(userProfileId)
        const sessionId = sessionResult.isSuccess
          ? sessionResult.data?.sessionId || null
          : null

        // Get health status (light or deep)
        const healthResult = deep
          ? await getWhatsAppDeepHealthAction()
          : await getWhatsAppHealthAction()

        if (!healthResult.isSuccess || !healthResult.data) {
          setState(prev => ({
            ...prev,
            status: "disconnected",
            serverReachable: false,
            connectionStatus: "server_error",
            lastError: healthResult.message,
            lastChecked: new Date(),
            isChecking: false,
            sessionId
          }))
          return
        }

        // Check if server returned error status (unreachable case from light health)
        const serverReachable = healthResult.data.status !== "error"

        // Handle different response types based on deep vs light health check
        let hasConnectedSession = false
        let connectionStatus = "disconnected"
        let phoneNumber: string | null = null

        if (deep) {
          // Deep health returns sessions as an array
          const deepData = healthResult.data as DeepHealthStatus
          const sessions = deepData.sessions
          const connectedSession = sessions.find(
            s => s.connectionStatus === "connected"
          )
          hasConnectedSession = !!connectedSession
          phoneNumber = connectedSession?.phoneNumber || null

          if (connectedSession) {
            connectionStatus = "connected"
          } else if (sessions.some(s => s.connectionStatus === "connecting")) {
            connectionStatus = "connecting"
          }
        } else {
          // Light health returns sessions as an object with counts
          const lightData = healthResult.data as HealthStatus
          hasConnectedSession = lightData.sessions.connected > 0

          if (lightData.sessions.connected > 0) {
            connectionStatus = "connected"
          } else if (lightData.sessions.connecting > 0) {
            connectionStatus = "connecting"
          }
        }

        // Determine binary status for UI indicator
        const status: "connected" | "disconnected" =
          serverReachable && hasConnectedSession ? "connected" : "disconnected"

        setState(prev => ({
          ...prev,
          status,
          serverReachable,
          connectionStatus,
          phoneNumber: phoneNumber || prev.phoneNumber,
          sessionId,
          lastChecked: new Date(),
          lastError: null,
          isChecking: false,
          uptime: healthResult.data.uptime
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: "disconnected",
          serverReachable: false,
          connectionStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
          lastChecked: new Date(),
          isChecking: false
        }))
      }
    },
    [userProfileId]
  )

  /**
   * Trigger reconnection for the current session
   * Sets status to reconnecting and initiates server-side reconnect
   */
  const reconnect = useCallback(async () => {
    if (!state.sessionId) return

    setState(prev => ({
      ...prev,
      isChecking: true,
      connectionStatus: "reconnecting"
    }))

    const result = await reconnectWhatsAppSessionAction(state.sessionId)

    if (!result.isSuccess) {
      setState(prev => ({
        ...prev,
        lastError: result.message,
        isChecking: false
      }))
      return
    }

    // Poll immediately after reconnect attempt to get updated status
    await checkHealth(false)
  }, [state.sessionId, checkHealth])

  /**
   * Force refresh status with deep health check
   */
  const refresh = useCallback(async () => {
    await checkHealth(true)
  }, [checkHealth])

  // Initial check and polling setup
  useEffect(() => {
    // Initial deep check on mount
    checkHealth(true)

    // Set up polling intervals
    const startPolling = () => {
      // Light poll every 30s
      lightPollRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          checkHealth(false)
        }
      }, LIGHT_POLL_INTERVAL)

      // Deep poll every 5min
      deepPollRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          checkHealth(true)
        }
      }, DEEP_POLL_INTERVAL)
    }

    startPolling()

    // Visibility change handler - pause polling when tab not visible
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible"

      if (isVisibleRef.current) {
        // Immediate check when tab becomes visible
        checkHealth(false)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (lightPollRef.current) clearInterval(lightPollRef.current)
      if (deepPollRef.current) clearInterval(deepPollRef.current)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [checkHealth])

  return (
    <WhatsAppStatusContext.Provider value={{ ...state, reconnect, refresh }}>
      {children}
    </WhatsAppStatusContext.Provider>
  )
}

/**
 * Hook to access WhatsApp status from context
 *
 * @throws Error if used outside of WhatsAppStatusProvider
 * @returns WhatsAppStatusState with current status and control functions
 */
export function useWhatsAppStatus() {
  const context = useContext(WhatsAppStatusContext)
  if (!context) {
    throw new Error("useWhatsAppStatus must be used within WhatsAppStatusProvider")
  }
  return context
}
