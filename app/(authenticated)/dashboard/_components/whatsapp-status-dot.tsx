"use client"

import { useWhatsAppStatus } from "../_context/whatsapp-status-context"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { RefreshCw, Settings } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * WhatsApp Status Dot Component
 *
 * A small indicator dot for the dashboard header that shows WhatsApp connection status.
 * - Green with glow: Connected
 * - Red with glow: Disconnected
 *
 * Clicking the dot opens a popover with:
 * - Connection status details
 * - Masked phone number (if connected)
 * - Reconnect button (if disconnected)
 * - Refresh button for manual status check
 * - Settings link to WhatsApp configuration
 *
 * Uses the WhatsAppStatusProvider context for real-time status updates.
 */
export function WhatsAppStatusDot() {
  const {
    status,
    connectionStatus,
    lastError,
    phoneNumber,
    isChecking,
    reconnect,
    refresh
  } = useWhatsAppStatus()

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
    return `+${phone.slice(0, 2)} ${"*".repeat(4)} ${phone.slice(-4)}`
  }

  return (
    <Popover>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-300",
                isConnected
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
                isChecking && "animate-pulse"
              )}
              aria-label={`WhatsApp ${isConnected ? "connected" : "disconnected"}`}
            />
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent side="bottom">
          <p>WhatsApp: {isConnected ? "Connected" : "Disconnected"}</p>
          {!isConnected && (
            <p className="text-xs text-muted-foreground">Click for details</p>
          )}
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-3 w-3 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="font-medium">
              WhatsApp {isConnected ? "Connected" : "Offline"}
            </span>
          </div>

          {phoneNumber && (
            <p className="text-sm text-muted-foreground">
              {formatPhoneNumber(phoneNumber)}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Status: {connectionStatus}
          </p>

          {lastError && <p className="text-xs text-red-500">{lastError}</p>}

          <div className="flex gap-2 border-t pt-2">
            {!isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={reconnect}
                disabled={isChecking}
                className="flex-1"
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
            >
              <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/dashboard/settings/whatsapp">
                <Settings className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
