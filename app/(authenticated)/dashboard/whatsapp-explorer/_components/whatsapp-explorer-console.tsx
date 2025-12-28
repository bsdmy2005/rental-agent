"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  testBaileysConnectionAction,
  getOrCreateSessionAction,
  getSessionStatusAction,
  connectSessionAction,
  disconnectSessionAction,
  logoutSessionAction,
  getMessagesAction,
  sendMessageAction,
  getAiConfigAction,
  updateAiConfigAction,
  testAiResponseAction,
  listSessionsAction,
  forgetPhoneNumberAction
} from "@/actions/whatsapp-explorer-actions"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  MessageSquare,
  Bot,
  Settings,
  RefreshCw,
  Send,
  LogOut,
  Unplug,
  QrCode
} from "lucide-react"
import type { StoredMessage } from "@/lib/whatsapp-baileys-client"

type ConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "logged_out"

export function WhatsAppExplorerConsole() {
  // Configuration state
  const [serverUrl, setServerUrl] = useState("http://localhost:3001")
  const [apiKey, setApiKey] = useState("")
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<ConnectionStatus>("disconnected")
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [phoneNumberInput, setPhoneNumberInput] = useState<string>("")
  const [statusError, setStatusError] = useState<string | null>(null)

  // Message state
  const [recipient, setRecipient] = useState("")
  const [messageContent, setMessageContent] = useState("")
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // AI state
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiSystemPrompt, setAiSystemPrompt] = useState(
    "You are a helpful assistant responding to WhatsApp messages. Keep responses concise and friendly."
  )
  const [aiTestMessage, setAiTestMessage] = useState("Hello, can you help me?")
  const [aiTestResult, setAiTestResult] = useState<{
    success: boolean
    response?: string
    error?: string
  } | null>(null)

  // UI state
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("config")
  const [pollingEnabled, setPollingEnabled] = useState(false)

  // Initialize session (but don't load phone number - start fresh each time)
  const initSession = useCallback(async () => {
    const result = await getOrCreateSessionAction("explorer")
    if (result.isSuccess && result.data) {
      setSessionId(result.data.sessionId)
      // Clear any existing phone number - start fresh
      setPhoneNumber(null)
      setPhoneNumberInput("")
      setSessionStatus("disconnected")
    }
  }, [])

  useEffect(() => {
    initSession()
  }, [initSession])

  // Poll for status when connecting or qr_pending
  useEffect(() => {
    if (!pollingEnabled || !sessionId || !apiKey) return
    if (sessionStatus !== "connecting" && sessionStatus !== "qr_pending") return

    const interval = setInterval(async () => {
      const result = await getSessionStatusAction(serverUrl, apiKey, sessionId)
      if (result.isSuccess && result.data) {
        setSessionStatus(result.data.connectionStatus)
        setQrCode(result.data.qrCode)
        // Only update phone number from server if we don't have one from input
        // This prevents overwriting the user's input with server data
        if (result.data.phoneNumber && !phoneNumberInput) {
          setPhoneNumber(result.data.phoneNumber)
        }
        setStatusError(result.data.lastError)

        if (result.data.connectionStatus === "connected") {
          setPollingEnabled(false)
          // Once connected, use the input phone number
          if (phoneNumberInput) {
            setPhoneNumber(phoneNumberInput.trim())
          }
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [pollingEnabled, sessionId, sessionStatus, serverUrl, apiKey, phoneNumberInput])

  // Poll for messages when connected
  useEffect(() => {
    if (sessionStatus !== "connected" || !sessionId || !apiKey) return

    const fetchMessages = async () => {
      const result = await getMessagesAction(serverUrl, apiKey, sessionId)
      if (result.isSuccess && result.data) {
        setMessages(result.data.messages)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [sessionStatus, sessionId, serverUrl, apiKey])

  // Load AI config when session is available
  useEffect(() => {
    if (!sessionId || !apiKey || sessionStatus !== "connected") return

    const loadAiConfig = async () => {
      try {
        const result = await getAiConfigAction(serverUrl, apiKey, sessionId)
        if (result.isSuccess && result.data?.config) {
          setAiEnabled(result.data.config.enabled)
          if (result.data.config.systemPrompt) {
            setAiSystemPrompt(result.data.config.systemPrompt)
          }
        }
      } catch (error) {
        console.error("Failed to load AI config:", error)
      }
    }

    loadAiConfig()
  }, [sessionId, apiKey, sessionStatus, serverUrl])

  const handleTestConnection = async () => {
    setLoading(true)
    setConnectionTestResult(null)
    try {
      const result = await testBaileysConnectionAction(serverUrl)
      setConnectionTestResult({
        success: result.isSuccess,
        message: result.message
      })
    } catch (error) {
      setConnectionTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed"
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to normalize phone number for Baileys (uses 27 instead of +27)
  const normalizePhoneNumber = (phone: string): string => {
    // Remove spaces, dashes, parentheses, and any + signs
    let cleaned = phone.replace(/[\s\-()+]/g, "")
    
    // If starts with 0, replace with 27 (South Africa country code without +)
    if (cleaned.startsWith("0")) {
      cleaned = "27" + cleaned.substring(1)
    } else if (!cleaned.startsWith("27") && cleaned.length >= 9) {
      // Assume it's a local number without country code, add 27
      cleaned = "27" + cleaned
    }
    
    return cleaned
  }

  // Helper function to format phone number for message sending (Baileys format: 27...)
  const formatPhoneForMessage = (phone: string): string => {
    // Remove spaces, dashes, parentheses, and any + signs
    let cleaned = phone.replace(/[\s\-()+]/g, "")
    
    // If starts with 0, replace with 27
    if (cleaned.startsWith("0")) {
      cleaned = "27" + cleaned.substring(1)
    } else if (cleaned.startsWith("27")) {
      // Already has 27, use as is
      cleaned = cleaned
    } else if (cleaned.length >= 9) {
      // Assume it's a local number, add 27
      cleaned = "27" + cleaned
    }
    
    return cleaned
  }

  const handleConnect = async () => {
    if (!sessionId) return
    
    // Validate phone number input
    if (!phoneNumberInput.trim()) {
      setStatusError("Please enter a phone number before connecting")
      return
    }

    // Normalize the phone number (adds +27 if needed)
    const normalizedPhone = normalizePhoneNumber(phoneNumberInput.trim())
    console.log(`[WhatsApp Explorer] Original input: ${phoneNumberInput.trim()}`)
    console.log(`[WhatsApp Explorer] Normalized phone: ${normalizedPhone}`)

    // Clear any previous phone number
    setPhoneNumber(null)
    setStatusError(null)
    setLoading(true)
    
    try {
      // First, clear the phone number in database to start fresh
      if (sessionId) {
        await forgetPhoneNumberAction(sessionId)
      }
      
      // Now connect
      const result = await connectSessionAction(serverUrl, apiKey, sessionId)
      if (result.isSuccess) {
        setSessionStatus("connecting")
        setPollingEnabled(true)
        // Store the normalized phone number for display (but don't save to DB until connected)
        setPhoneNumber(normalizedPhone)
        // Update input to show normalized version
        setPhoneNumberInput(normalizedPhone)
      } else {
        setStatusError(result.message)
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      await disconnectSessionAction(serverUrl, apiKey, sessionId)
      setSessionStatus("disconnected")
      setQrCode(null)
      setPollingEnabled(false)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to disconnect")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      await logoutSessionAction(serverUrl, apiKey, sessionId)
      setSessionStatus("logged_out")
      setQrCode(null)
      setPhoneNumber(null)
      setPhoneNumberInput("") // Clear input as well
      setPollingEnabled(false)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to logout")
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshStatus = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await getSessionStatusAction(serverUrl, apiKey, sessionId)
      if (result.isSuccess && result.data) {
        setSessionStatus(result.data.connectionStatus)
        setQrCode(result.data.qrCode)
        setPhoneNumber(result.data.phoneNumber)
        setStatusError(result.data.lastError)
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to refresh status")
    } finally {
      setLoading(false)
    }
  }

  const handleForgetNumber = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await forgetPhoneNumberAction(sessionId)
      if (result.isSuccess) {
        setPhoneNumber(null)
        setPhoneNumberInput("") // Clear input as well
        setSessionStatus("disconnected")
        setQrCode(null)
        setPollingEnabled(false)
        setStatusError(null)
      } else {
        setStatusError(result.message)
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Failed to forget phone number")
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!sessionId || !recipient || !messageContent) return
    setLoading(true)
    setSendResult(null)
    try {
      // Format recipient phone number for Baileys (27 format, not +27)
      const formattedRecipient = formatPhoneForMessage(recipient.trim())
      console.log(`[WhatsApp Explorer] Original recipient: ${recipient.trim()}`)
      console.log(`[WhatsApp Explorer] Formatted recipient: ${formattedRecipient}`)
      
      const result = await sendMessageAction(serverUrl, apiKey, sessionId, formattedRecipient, messageContent)
      setSendResult({
        success: result.isSuccess,
        message: result.isSuccess ? `Message sent (ID: ${result.data?.messageId})` : result.message
      })
      if (result.isSuccess) {
        setMessageContent("")
        // Refresh messages
        const msgResult = await getMessagesAction(serverUrl, apiKey, sessionId)
        if (msgResult.isSuccess && msgResult.data) {
          setMessages(msgResult.data.messages)
        }
      }
    } catch (error) {
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAiConfig = async () => {
    if (!sessionId) return
    setLoading(true)
    console.log(`[WhatsApp Explorer] Saving AI config - Enabled: ${aiEnabled}, Session: ${sessionId}`)
    try {
      const result = await updateAiConfigAction(serverUrl, apiKey, sessionId, {
        enabled: aiEnabled,
        systemPrompt: aiSystemPrompt
      })
      if (result.isSuccess) {
        console.log(`[WhatsApp Explorer] ✓ AI config saved successfully`)
        setAiTestResult({
          success: true,
          response: "AI configuration saved successfully. Auto-responder is now " + (aiEnabled ? "enabled" : "disabled")
        })
      } else {
        console.error(`[WhatsApp Explorer] ✗ Failed to save AI config:`, result.message)
        setAiTestResult({
          success: false,
          error: result.message
        })
      }
    } catch (error) {
      console.error("Failed to save AI config:", error)
      setAiTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to save config"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestAi = async () => {
    if (!sessionId) return
    setLoading(true)
    setAiTestResult(null)
    try {
      const result = await testAiResponseAction(
        serverUrl,
        apiKey,
        sessionId,
        aiTestMessage,
        aiSystemPrompt
      )
      if (result.isSuccess && result.data) {
        setAiTestResult({
          success: result.data.success,
          response: result.data.response,
          error: result.data.error
        })
      } else {
        setAiTestResult({
          success: false,
          error: result.message
        })
      }
    } catch (error) {
      setAiTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Test failed"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return "text-green-600"
      case "connecting":
      case "qr_pending":
        return "text-yellow-600"
      case "disconnected":
      case "logged_out":
        return "text-gray-500"
      default:
        return "text-gray-500"
    }
  }

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "connecting":
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
      case "qr_pending":
        return <QrCode className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="config" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configuration
        </TabsTrigger>
        <TabsTrigger value="connection" className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Connection
        </TabsTrigger>
        <TabsTrigger value="messages" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages
        </TabsTrigger>
        <TabsTrigger value="ai" className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Config
        </TabsTrigger>
      </TabsList>

      {/* Configuration Tab */}
      <TabsContent value="config">
        <Card>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure the connection to your WhatsApp Baileys server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serverUrl">Baileys Server URL</Label>
                <Input
                  id="serverUrl"
                  placeholder="http://localhost:3001"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleTestConnection} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Connection
            </Button>

            {connectionTestResult && (
              <Alert variant={connectionTestResult.success ? "default" : "destructive"}>
                {connectionTestResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {connectionTestResult.success ? "Connected" : "Connection Failed"}
                </AlertTitle>
                <AlertDescription>{connectionTestResult.message}</AlertDescription>
              </Alert>
            )}

            {sessionId && (
              <div className="text-sm text-muted-foreground">
                Session ID: <code className="bg-muted px-1 rounded">{sessionId}</code>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Connection Tab */}
      <TabsContent value="connection">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(sessionStatus)}
              Connection Status
            </CardTitle>
            <CardDescription>
              Connect your WhatsApp account by scanning the QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`text-lg font-medium ${getStatusColor(sessionStatus)}`}>
                Status: {sessionStatus.replace("_", " ").toUpperCase()}
              </div>
              <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {(sessionStatus === "disconnected" || sessionStatus === "logged_out") && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumberInput">Phone Number to Connect</Label>
                <Input
                  id="phoneNumberInput"
                  placeholder="0821234567 or +27821234567"
                  value={phoneNumberInput}
                  onChange={(e) => {
                    // Allow user to type freely, but show formatted version
                    setPhoneNumberInput(e.target.value)
                  }}
                  disabled={loading || sessionStatus === "connecting" || sessionStatus === "qr_pending"}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Enter your phone number (any format works):</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Local format: <code className="bg-muted px-1 rounded">0821234567</code> (recommended - just start with 0)</li>
                    <li>Or: <code className="bg-muted px-1 rounded">27821234567</code> (with 27, no +)</li>
                  </ul>
                  <p className="mt-1">
                    The system automatically converts to <code className="bg-muted px-1 rounded">27...</code> format for Baileys. 
                    Just enter your number starting with <code className="bg-muted px-1 rounded">0</code> - it's the simplest!
                  </p>
                </div>
              </div>
            )}

            {phoneNumber && sessionStatus === "connected" && (
              <Alert>
                <Phone className="h-4 w-4" />
                <AlertTitle>Connected Phone Number</AlertTitle>
                <AlertDescription>
                  Currently connected to: <span className="font-medium">{phoneNumber}</span>
                </AlertDescription>
              </Alert>
            )}

            {statusError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{statusError}</AlertDescription>
              </Alert>
            )}

            {sessionStatus === "qr_pending" && qrCode && (
              <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg border-2 border-dashed">
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code with your WhatsApp app
                  <br />
                  <span className="text-xs">Open WhatsApp → Settings → Linked Devices → Link a Device</span>
                </p>
                {phoneNumberInput && (
                  <p className="text-xs text-muted-foreground">
                    Connecting as: <span className="font-medium">{phoneNumberInput}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                {sessionStatus === "disconnected" || sessionStatus === "logged_out" ? (
                  <Button 
                    onClick={handleConnect} 
                    disabled={loading || !apiKey || !phoneNumberInput.trim()}
                    className="flex-1"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                    Connect & Show QR Code
                  </Button>
                ) : sessionStatus === "connected" ? (
                  <>
                    <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
                      <Unplug className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                    <Button variant="destructive" onClick={handleLogout} disabled={loading}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout & Clear Auth
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
                    Cancel
                  </Button>
                )}
              </div>

            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Workflow</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p><strong>1. Test Connection:</strong> Verify the Baileys server is reachable</p>
                <p><strong>2. Enter Phone Number:</strong> Type the phone number you want to connect</p>
                <p><strong>3. Connect:</strong> Click "Connect & Show QR Code" to start the connection</p>
                <p><strong>4. Scan QR Code:</strong> Use WhatsApp to scan the displayed QR code</p>
                <p className="mt-2 text-muted-foreground">
                  Note: Phone numbers are not remembered. You must enter a phone number each time you want to connect.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Messages Tab */}
      <TabsContent value="messages">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
              <CardDescription>Send a WhatsApp message to any number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Phone Number</Label>
                  <Input
                    id="recipient"
                    placeholder="0821234567 or 27821234567"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter number starting with <code className="bg-muted px-1 rounded">0</code> (e.g., 0821234567) or with <code className="bg-muted px-1 rounded">27</code> (e.g., 27821234567). 
                    The system will format it correctly for Baileys (27 format, not +27).
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="messageContent">Message</Label>
                <Textarea
                  id="messageContent"
                  placeholder="Type your message here..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || sessionStatus !== "connected" || !recipient || !messageContent}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Message
              </Button>

              {sendResult && (
                <Alert variant={sendResult.success ? "default" : "destructive"}>
                  {sendResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>{sendResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
              <CardDescription>Recent messages (auto-refreshes every 5 seconds when connected)</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.fromMe ? "bg-blue-50 ml-8" : "bg-gray-50 mr-8"
                      }`}
                    >
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{msg.fromMe ? "You" : msg.remoteJid.split("@")[0]}</span>
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-sm">{msg.content || `[${msg.messageType}]`}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* AI Configuration Tab */}
      <TabsContent value="ai">
        <Card>
          <CardHeader>
            <CardTitle>AI Auto-Response Configuration</CardTitle>
            <CardDescription>
              Configure AI-powered automatic responses to incoming messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable AI Auto-Response</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically respond to incoming messages using AI. OpenAI API key and model are configured via environment variables.
                  <br />
                  <span className="text-xs font-medium text-amber-600">
                    ⚠️ Remember to click "Save Configuration" after enabling/disabling!
                  </span>
                </p>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Configuration</AlertTitle>
              <AlertDescription className="text-xs">
                <p><strong>OpenAI API Key:</strong> Read from <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code> environment variable</p>
                <p><strong>Model:</strong> Read from <code className="bg-muted px-1 rounded">OPENAI_MODEL</code> environment variable (defaults to <code className="bg-muted px-1 rounded">gpt-4</code> if not set)</p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="aiSystemPrompt">System Prompt</Label>
              <Textarea
                id="aiSystemPrompt"
                placeholder="You are a helpful assistant..."
                value={aiSystemPrompt}
                onChange={(e) => setAiSystemPrompt(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Customize the AI's behavior and personality through the system prompt.
              </p>
            </div>

            <Button onClick={handleSaveAiConfig} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Configuration
            </Button>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <div className="w-full space-y-2">
              <Label htmlFor="aiTestMessage">Test Message</Label>
              <div className="flex gap-2">
                <Input
                  id="aiTestMessage"
                  placeholder="Enter a test message..."
                  value={aiTestMessage}
                  onChange={(e) => setAiTestMessage(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTestAi} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test AI
                </Button>
              </div>
            </div>

            {aiTestResult && (
              <Alert variant={aiTestResult.success ? "default" : "destructive"} className="w-full">
                {aiTestResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{aiTestResult.success ? "AI Response" : "Error"}</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {aiTestResult.success ? aiTestResult.response : aiTestResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
