"use client"

import { useWhatsAppStatus } from "../_context/whatsapp-status-context"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { RefreshCw, Settings, ChevronDown, MessageCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useState } from "react"

/**
 * WhatsApp Status Badge Component
 *
 * A collapsible status indicator designed for the sidebar footer.
 * Shows WhatsApp connection status with expandable details.
 *
 * Features:
 * - Collapsed view: Shows WhatsApp Online/Offline with status dot
 * - Expanded view: Shows phone number, status, last check time, uptime
 * - Reconnect button when disconnected
 * - Refresh button for manual status check
 * - Settings link to WhatsApp configuration
 *
 * Uses the WhatsAppStatusProvider context for real-time status updates.
 */
export function WhatsAppStatusBadge() {
  const {
    status,
    connectionStatus,
    lastError,
    phoneNumber,
    lastChecked,
    isChecking,
    uptime,
    reconnect,
    refresh
  } = useWhatsAppStatus()

  const [isOpen, setIsOpen] = useState(false)

  const isConnected = status === "connected"

  /**
   * Masks phone number for privacy display
   * Example: +27123456789 -> +27 **** 6789
   *
   * @param phone - The phone number to mask
   * @returns Masked phone number string
   */
  const formatPhoneNumber = (phone: string) => {
    if (phone.length < 8) return phone

    // Normalize: remove + if present
    const normalized = phone.replace(/^\+/, "")
    const countryCode = normalized.slice(0, 2)
    const lastFour = normalized.slice(-4)

    return `+${countryCode} ${"*".repeat(4)} ${lastFour}`
  }

  /**
   * Formats the last checked timestamp into a human-readable relative time
   *
   * @param date - The date to format
   * @returns Human-readable relative time string
   */
  const formatLastChecked = (date: Date | null) => {
    if (!date) return "Never"
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  /**
   * Formats uptime seconds into a compact human-readable format
   *
   * @param seconds - The uptime in seconds
   * @returns Formatted uptime string (e.g., "5m", "2h", "3d")
   */
  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="WhatsApp status details"
        >
          <MessageCircle className="h-4 w-4 min-h-[16px] min-w-[16px] text-muted-foreground flex-shrink-0" />
          <div
            className={cn(
              "h-2.5 w-2.5 min-h-[10px] min-w-[10px] rounded-full flex-shrink-0",
              isConnected ? "bg-green-500" : "bg-red-500"
            )}
          />
          <span className="flex-1 text-left text-muted-foreground truncate">
            WhatsApp {isConnected ? "Online" : "Offline"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-2 pb-2">
        <div className="space-y-2 rounded-md bg-muted/50 p-2 text-xs">
          {phoneNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{formatPhoneNumber(phoneNumber)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="capitalize">
              {connectionStatus.replace("_", " ")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Last check</span>
            <span>{formatLastChecked(lastChecked)}</span>
          </div>

          {uptime > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server uptime</span>
              <span>{formatUptime(uptime)}</span>
            </div>
          )}

          {lastError && (
            <p className="border-t pt-1 text-red-500">{lastError}</p>
          )}

          <div className="flex gap-1 border-t pt-2">
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={reconnect}
                disabled={isChecking}
                className="h-7 flex-1 text-xs"
              >
                <RefreshCw
                  className={cn("mr-1 h-3 w-3", isChecking && "animate-spin")}
                />
                Reconnect
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              disabled={isChecking}
              className="h-7 px-2"
              title="Refresh status"
            >
              <RefreshCw
                className={cn("h-3 w-3", isChecking && "animate-spin")}
              />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="h-7 px-2"
              title="WhatsApp settings"
            >
              <Link href="/dashboard/settings/whatsapp">
                <Settings className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
