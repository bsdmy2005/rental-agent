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
    connectionStatus: "disconnected",
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
  const sessionIdRef = useRef<string | null>(null)
  const isCheckingRef = useRef(false)

  /**
   * Check WhatsApp health status
   *
   * @param deep - If true, performs deep health check with session details
   */
  const checkHealth = useCallback(
    async (deep: boolean = false) => {
      // Prevent concurrent checks using ref
      if (isCheckingRef.current) return
      isCheckingRef.current = true
      setState(prev => ({ ...prev, isChecking: true }))

      try {
        // Get session ID first
        const sessionResult =
          await getPrimaryWhatsAppSessionAction(userProfileId)
        const sessionId = sessionResult.isSuccess
          ? sessionResult.data?.sessionId || null
          : null

        // Keep sessionIdRef synchronized for reconnect callback
        sessionIdRef.current = sessionId

        // Get health status (light or deep)
        const healthResult = deep
          ? await getWhatsAppDeepHealthAction()
          : await getWhatsAppHealthAction()

        if (!healthResult.isSuccess || !healthResult.data) {
          // Debug logging in development
          if (process.env.NODE_ENV === "development") {
            console.warn("[WhatsApp Status] Health check failed:", {
              isSuccess: healthResult.isSuccess,
              message: healthResult.message,
              hasData: !!healthResult.data,
              deep
            })
          }

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
        // Prioritize connectionStatus === "connected" as the source of truth
        // This ensures that if the connection status is "connected", we show green
        // even if other checks might fail
        const status: "connected" | "disconnected" =
          connectionStatus === "connected" || (serverReachable && hasConnectedSession)
            ? "connected"
            : "disconnected"

        // Debug logging in development
        if (process.env.NODE_ENV === "development") {
          console.log("[WhatsApp Status] Health check result:", {
            deep,
            serverReachable,
            hasConnectedSession,
            connectionStatus,
            status,
            phoneNumber,
            sessionId,
            uptime: healthResult.data.uptime
          })
        }

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
        const errorMessage = error instanceof Error ? error.message : String(error) || "Unknown error"
        
        // Debug logging in development
        if (process.env.NODE_ENV === "development") {
          console.error("[WhatsApp Status] Health check error:", errorMessage, {
            deep,
            userProfileId,
            errorType: error instanceof Error ? error.constructor.name : typeof error
          })
        }

        setState(prev => ({
          ...prev,
          status: "disconnected",
          serverReachable: false,
          connectionStatus: "error",
          lastError: errorMessage,
          lastChecked: new Date(),
          isChecking: false
        }))
      } finally {
        isCheckingRef.current = false
      }
    },
    [userProfileId]
  )

  /**
   * Trigger reconnection for the current session
   * Sets status to reconnecting and initiates server-side reconnect
   * Uses sessionIdRef to avoid stale closure issues
   */
  const reconnect = useCallback(async () => {
    const currentSessionId = sessionIdRef.current
    if (!currentSessionId) {
      setState(prev => ({
        ...prev,
        lastError:
          "No active session to reconnect. Please set up WhatsApp first."
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isChecking: true,
      connectionStatus: "reconnecting"
    }))

    const result = await reconnectWhatsAppSessionAction(currentSessionId)

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
  }, [checkHealth])

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

      // Only trigger check if tab becomes visible and not already checking
      if (isVisibleRef.current && !isCheckingRef.current) {
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
