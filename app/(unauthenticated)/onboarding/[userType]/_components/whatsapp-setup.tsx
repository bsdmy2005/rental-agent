"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  getPrimarySessionStatusAction,
  setPrimaryWhatsAppNumberAction
} from "@/actions/whatsapp-primary-session-actions"
import {
  CheckCircle2,
  Loader2,
  Phone,
  RefreshCw,
  QrCode,
  AlertCircle
} from "lucide-react"

type ConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "logged_out"

interface WhatsAppSetupProps {
  userProfileId: string
  onComplete?: () => void
  onSkip?: () => void
}

export function WhatsAppSetup({ userProfileId, onComplete, onSkip }: WhatsAppSetupProps) {
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

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    }
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect WhatsApp (Optional)</CardTitle>
        <CardDescription>
          Connect your WhatsApp account to send RFQ requests and receive incident reports via WhatsApp.
          You can skip this step and configure it later in settings.
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
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              WhatsApp is connected! You can now use WhatsApp for RFQ dispatch and incident logging.
            </AlertDescription>
          </Alert>
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for connection...
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-4">
          {connectionStatus === "connected" ? (
            <Button onClick={handleComplete} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button onClick={handleSkip} variant="outline" className="flex-1">
              Skip for Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

