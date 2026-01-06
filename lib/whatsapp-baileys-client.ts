/**
 * Client library for WhatsApp Baileys Server API
 * Used by the WhatsApp Explorer page to communicate with the standalone Baileys server
 */

export interface BaileysServerConfig {
  serverUrl: string
  apiKey: string
}

export interface SessionStatus {
  sessionId: string
  connectionStatus: "disconnected" | "connecting" | "qr_pending" | "connected" | "logged_out"
  qrCode: string | null
  phoneNumber: string | null
  lastError: string | null
}

export interface StoredMessage {
  id: string
  sessionId: string
  messageId: string
  remoteJid: string
  fromMe: boolean
  messageType: string
  content: string | null
  mediaUrl: string | null
  status: string | null
  timestamp: string
}

export interface SendMessageResult {
  success: boolean
  messageId: string
  timestamp: string
  recipient: string
  content: string
}

export interface AiConfig {
  enabled: boolean
  systemPrompt: string
  model: string
  hasApiKey: boolean
}

export interface AiTestResult {
  success: boolean
  response?: string
  error?: string
  model: string
  tokensUsed?: number
}

class WhatsAppBaileysClient {
  private config: BaileysServerConfig

  constructor(config: BaileysServerConfig) {
    this.config = config
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.serverUrl}${path}`
    const method = options.method || "GET"
    const timestamp = new Date().toISOString()

    // Log request details
    console.log(`[WhatsApp Baileys Client] ${timestamp} - ${method} ${path}`)
    if (options.body) {
      try {
        const bodyData = JSON.parse(options.body as string)
        console.log(`[WhatsApp Baileys Client] Request body:`, JSON.stringify(bodyData, null, 2))
      } catch (e) {
        console.log(`[WhatsApp Baileys Client] Request body:`, options.body)
      }
    }
    console.log(`[WhatsApp Baileys Client] Server URL: ${this.config.serverUrl}`)
    console.log(`[WhatsApp Baileys Client] API Key: ${this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...` : "not set"}`)

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        ...options.headers
      }
    })

    const responseTime = new Date().toISOString()
    const data = await response.json()

    // Log response details
    console.log(`[WhatsApp Baileys Client] ${responseTime} - Response status: ${response.status}`)
    console.log(`[WhatsApp Baileys Client] Response data:`, JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error(`[WhatsApp Baileys Client] Request failed:`, data.error || `Status ${response.status}`)
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }

    return data as T
  }

  /**
   * Test connection to the Baileys server
   */
  async testConnection(): Promise<{ status: string; timestamp: string; service: string }> {
    // Health endpoint doesn't require auth
    const response = await fetch(`${this.config.serverUrl}/health`)
    if (!response.ok) {
      throw new Error("Failed to connect to Baileys server")
    }
    return response.json()
  }

  /**
   * Get session status including QR code if available
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    return this.request<SessionStatus>(`/sessions/${sessionId}/status`)
  }

  /**
   * Initiate connection for a session
   */
  async connect(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${sessionId}/connect`, {
      method: "POST"
    })
  }

  /**
   * Disconnect a session
   */
  async disconnect(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${sessionId}/disconnect`, {
      method: "POST"
    })
  }

  /**
   * Reconnect a session (disconnect and reconnect)
   * Used to recover from connection issues
   */
  async reconnect(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${sessionId}/reconnect`, {
      method: "POST"
    })
  }

  /**
   * Logout and clear auth state for a session
   */
  async logout(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${sessionId}/logout`, {
      method: "POST"
    })
  }

  /**
   * Get messages for a session
   */
  async getMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    sessionId: string
    messages: StoredMessage[]
    pagination: { limit: number; offset: number; count: number }
  }> {
    return this.request(`/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`)
  }

  /**
   * Send a message
   */
  async sendMessage(
    sessionId: string,
    recipient: string,
    content: string
  ): Promise<SendMessageResult> {
    const timestamp = new Date().toISOString()
    console.log(`[WhatsApp Baileys Client] ${timestamp} - Sending message`)
    console.log(`[WhatsApp Baileys Client] Session ID: ${sessionId}`)
    console.log(`[WhatsApp Baileys Client] Recipient: ${recipient}`)
    console.log(`[WhatsApp Baileys Client] Content: ${content}`)
    console.log(`[WhatsApp Baileys Client] Content length: ${content.length} characters`)
    
    const result = await this.request<SendMessageResult>(`/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ recipient, content })
    })
    
    console.log(`[WhatsApp Baileys Client] Message sent successfully`)
    console.log(`[WhatsApp Baileys Client] Message ID: ${result.messageId}`)
    console.log(`[WhatsApp Baileys Client] Timestamp: ${result.timestamp}`)
    
    return result
  }

  /**
   * Send a media message (image or document)
   */
  async sendMediaMessage(
    sessionId: string,
    recipient: string,
    mediaUrl: string,
    mediaType: "image" | "document" = "image",
    caption?: string
  ): Promise<SendMessageResult> {
    const timestamp = new Date().toISOString()
    console.log(`[WhatsApp Baileys Client] ${timestamp} - Sending media message`)
    console.log(`[WhatsApp Baileys Client] Session ID: ${sessionId}`)
    console.log(`[WhatsApp Baileys Client] Recipient: ${recipient}`)
    console.log(`[WhatsApp Baileys Client] Media URL: ${mediaUrl}`)
    console.log(`[WhatsApp Baileys Client] Media Type: ${mediaType}`)
    
    const result = await this.request<SendMessageResult>(`/sessions/${sessionId}/media`, {
      method: "POST",
      body: JSON.stringify({ recipient, mediaUrl, mediaType, caption })
    })
    
    console.log(`[WhatsApp Baileys Client] Media message sent successfully`)
    console.log(`[WhatsApp Baileys Client] Message ID: ${result.messageId}`)
    console.log(`[WhatsApp Baileys Client] Timestamp: ${result.timestamp}`)
    
    return result
  }

  /**
   * Get AI configuration for a session
   */
  async getAiConfig(sessionId: string): Promise<{ sessionId: string; config: AiConfig | null }> {
    return this.request(`/sessions/${sessionId}/ai-config`)
  }

  /**
   * Update AI configuration for a session
   */
  async updateAiConfig(
    sessionId: string,
    config: {
      enabled: boolean
      systemPrompt: string
      model: string
      openaiApiKey: string
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${sessionId}/ai-config`, {
      method: "PUT",
      body: JSON.stringify(config)
    })
  }

  /**
   * Test AI response
   */
  async testAi(
    sessionId: string,
    testMessage: string,
    systemPrompt: string,
    model: string,
    openaiApiKey: string
  ): Promise<AiTestResult> {
    return this.request(`/sessions/${sessionId}/test-ai`, {
      method: "POST",
      body: JSON.stringify({ testMessage, systemPrompt, model, openaiApiKey })
    })
  }
}

/**
 * Create a WhatsApp Baileys client instance
 */
export function createWhatsAppBaileysClient(config: BaileysServerConfig): WhatsAppBaileysClient {
  return new WhatsAppBaileysClient(config)
}

/**
 * Create a client with environment variables
 */
export function createWhatsAppBaileysClientFromEnv(): WhatsAppBaileysClient {
  // Use dynamic import to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getWhatsAppServerUrl } = require("@/lib/utils/get-app-url")
  const serverUrl = getWhatsAppServerUrl()
  const apiKey = process.env.WHATSAPP_SERVER_API_KEY || ""

  return new WhatsAppBaileysClient({ serverUrl, apiKey })
}
