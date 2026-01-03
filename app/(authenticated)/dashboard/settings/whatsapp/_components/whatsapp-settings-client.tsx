"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getPrimarySessionStatusAction,
  setPrimaryWhatsAppNumberAction,
  forceDisconnectPrimarySessionAction
} from "@/actions/whatsapp-primary-session-actions"
import {
  CheckCircle2,
  Loader2,
  Phone,
  RefreshCw,
  QrCode,
  AlertCircle,
  XCircle,
  Trash2
} from "lucide-react"

type ConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "logged_out"

interface WhatsAppSettingsClientProps {
  userProfileId: string
}

export function WhatsAppSettingsClient({ userProfileId }: WhatsAppSettingsClientProps) {
  const [phoneNumberInput, setPhoneNumberInput] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing status
  const loadStatus = useCallback(async () => {
    const result = await getPrimarySessionStatusAction(userProfileId)
    if (result.isSuccess && result.data) {
      setConnectionStatus(result.data.connectionStatus as ConnectionStatus)
      setQrCode(result.data.qrCode)
      if (result.data.phoneNumber) {
        // Format phone number for display (27... -> 0...)
        const formatted = result.data.phoneNumber.startsWith("27")
          ? "0" + result.data.phoneNumber.substring(2)
          : result.data.phoneNumber
        setPhoneNumberInput(formatted)
      }
    }
  }, [userProfileId])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // Poll for status updates when connecting
  useEffect(() => {
    if (connectionStatus === "connecting" || connectionStatus === "qr_pending") {
      const interval = setInterval(() => {
        loadStatus()
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    }
  }, [connectionStatus, loadStatus])

  const handleConnect = async () => {
    if (!phoneNumberInput.trim()) {
      setError("Please enter a phone number")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await setPrimaryWhatsAppNumberAction(userProfileId, phoneNumberInput)
      if (result.isSuccess && result.data) {
        setQrCode(result.data.qrCode)
        setConnectionStatus("qr_pending")
        await loadStatus()
      } else {
        setError(result.message || "Failed to initiate connection")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  const handleForceDisconnect = async () => {
    if (!confirm("Are you sure you want to forget this connection? This will disconnect and clear all connection data. You'll need to set up a fresh connection.")) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await forceDisconnectPrimarySessionAction(userProfileId)
      if (result.isSuccess) {
        // Reset all state
        setConnectionStatus("disconnected")
        setQrCode(null)
        setPhoneNumberInput("")
        await loadStatus()
      } else {
        setError(result.message || "Failed to forget connection")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to forget connection")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your primary WhatsApp account for RFQ dispatch and incident logging.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primary WhatsApp Account</CardTitle>
          <CardDescription>
            Connect your WhatsApp account to send RFQ requests and receive incident reports via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {connectionStatus === "connected" ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  WhatsApp is connected! Your primary WhatsApp number is configured and ready to use.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={handleForceDisconnect}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Forget Connection
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0821234567"
                    value={phoneNumberInput}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    disabled={loading || connectionStatus === "connecting" || connectionStatus === "qr_pending"}
                  />
                  <Button
                    onClick={handleConnect}
                    disabled={loading || connectionStatus === "connecting" || connectionStatus === "qr_pending"}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Phone className="mr-2 h-4 w-4" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your WhatsApp phone number (e.g., 0821234567)
                </p>
              </div>

              {qrCode && (
                <div className="space-y-2">
                  <Label>Scan QR Code</Label>
                  <div className="flex items-center justify-center rounded-lg border p-4">
                    <img src={qrCode} alt="QR Code" className="max-w-full" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and scan this QR code.
                  </p>
                  <Button
                    variant="outline"
                    onClick={loadStatus}
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>
              )}

              {(connectionStatus === "connecting" || connectionStatus === "qr_pending") && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for connection...
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleForceDisconnect}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel & Forget Connection
                      </>
                    )}
                  </Button>
                </div>
              )}

              {(connectionStatus === "disconnected" || connectionStatus === "logged_out") && phoneNumberInput && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleForceDisconnect}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Forget Connection
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

