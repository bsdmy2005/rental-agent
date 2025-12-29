import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import QRCode from "qrcode"
import { PostgresAuthState } from "./auth-state.js"
import type { ConnectionStatus, SessionInfo } from "./types.js"
import { createLogger } from "../utils/logger.js"
import { MessageHandler } from "./message-handler.js"
import { Pool } from "pg"
import { env } from "../config/env.js"

const logger = createLogger("connection-manager")

export class ConnectionManager {
  private static instance: ConnectionManager
  private sessions: Map<string, SessionInfo> = new Map()
  private authState: PostgresAuthState
  private pool: Pool
  private messageHandler: MessageHandler

  private constructor() {
    this.authState = new PostgresAuthState()
    this.pool = new Pool({ connectionString: env.databaseUrl })
    this.messageHandler = new MessageHandler(this.pool)
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
    }
    return ConnectionManager.instance
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId)
  }

  async getSessionStatus(sessionId: string): Promise<{
    connectionStatus: ConnectionStatus
    qrCode: string | null
    phoneNumber: string | null
    lastError: string | null
  }> {
    const session = this.sessions.get(sessionId)
    if (session) {
      return {
        connectionStatus: session.connectionStatus,
        qrCode: session.qrCode,
        phoneNumber: session.phoneNumber,
        lastError: session.lastError
      }
    }

    // Check database for status
    const result = await this.pool.query(
      "SELECT connection_status, phone_number FROM whatsapp_sessions WHERE id = $1",
      [sessionId]
    )

    if (result.rows[0]) {
      return {
        connectionStatus: result.rows[0].connection_status || "disconnected",
        qrCode: null,
        phoneNumber: result.rows[0].phone_number,
        lastError: null
      }
    }

    return {
      connectionStatus: "disconnected",
      qrCode: null,
      phoneNumber: null,
      lastError: null
    }
  }

  /**
   * Get status of all active sessions (for health check)
   */
  getAllSessionsStatus(): Array<{
    sessionId: string
    connectionStatus: ConnectionStatus
    phoneNumber: string | null
    lastConnectedAt: Date | null
    socketAlive: boolean
  }> {
    const results: Array<{
      sessionId: string
      connectionStatus: ConnectionStatus
      phoneNumber: string | null
      lastConnectedAt: Date | null
      socketAlive: boolean
    }> = []

    for (const [sessionId, session] of this.sessions) {
      results.push({
        sessionId,
        connectionStatus: session.connectionStatus,
        phoneNumber: session.phoneNumber,
        lastConnectedAt: null, // Will be populated from DB in health route
        socketAlive: session.socket !== null && session.connectionStatus === "connected"
      })
    }

    return results
  }

  async connect(sessionId: string): Promise<void> {
    logger.info({ sessionId }, "Starting connection")

    // If this is an incident-dispatch server, only allow primary sessions
    if (env.serviceType === "incident-dispatch") {
      const sessionResult = await this.pool.query(
        "SELECT session_name FROM whatsapp_sessions WHERE id = $1",
        [sessionId]
      )
      
      if (!sessionResult.rows[0]) {
        throw new Error(`Session ${sessionId} not found`)
      }
      
      const sessionName = sessionResult.rows[0].session_name
      if (sessionName !== "primary") {
        logger.warn(
          { sessionId, sessionName, serviceType: env.serviceType },
          "Rejecting connection: Only primary sessions are allowed on incident-dispatch server"
        )
        throw new Error(
          `This server only accepts primary sessions. Session '${sessionName}' is not allowed.`
        )
      }
      
      logger.info({ sessionId, sessionName }, "Primary session validated for incident-dispatch server")
    }

    // Check if already connected
    const existing = this.sessions.get(sessionId)
    if (existing?.socket && existing.connectionStatus === "connected") {
      logger.info({ sessionId }, "Already connected")
      return
    }

    // Initialize session info
    this.sessions.set(sessionId, {
      socket: null,
      qrCode: null,
      connectionStatus: "connecting",
      phoneNumber: null,
      lastError: null
    })

    await this.updateDbStatus(sessionId, "connecting")

    try {
      const { version } = await fetchLatestBaileysVersion()
      logger.info({ version }, "Using Baileys version")

      const { state, saveCreds } = await this.authState.getAuthState(sessionId)

      logger.debug({ sessionId, hasCreds: !!state.creds, hasKeys: !!state.keys }, "Creating Baileys socket")
      
      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        logger: logger.child({ level: "debug" }), // Use debug level for Baileys internal logs
        defaultQueryTimeoutMs: env.baileysTimeoutMs
      })

      logger.info({ sessionId, socketCreated: true }, "Baileys socket created")

      this.setupEventHandlers(sessionId, socket, saveCreds)
    } catch (error) {
      logger.error({ error, sessionId }, "Failed to start connection")
      await this.updateSessionError(sessionId, error instanceof Error ? error.message : "Connection failed")
      throw error
    }
  }

  private setupEventHandlers(
    sessionId: string,
    socket: WASocket,
    saveCreds: () => Promise<void>
  ): void {
    logger.info({ sessionId }, "Setting up WebSocket event handlers")

    // Connection updates - detailed logging for WebSocket persistence
    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update

      logger.debug(
        {
          sessionId,
          connection,
          isNewLogin,
          hasQr: !!qr,
          hasLastDisconnect: !!lastDisconnect,
          socketUser: socket.user?.id,
          socketConnected: socket.user !== undefined
        },
        "Connection update received"
      )

      // Log connection state changes for persistence tracking
      if (connection) {
        logger.info(
          {
            sessionId,
            connectionState: connection,
            previousState: this.sessions.get(sessionId)?.connectionStatus,
            socketUser: socket.user?.id,
            socketExists: !!socket
          },
          `WebSocket connection state changed to: ${connection}`
        )
      }

      if (qr) {
        logger.info({ sessionId, qrLength: qr.length }, "QR code received from WhatsApp")
        // Generate QR code as base64
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 256 })
          this.updateSession(sessionId, {
            qrCode: qrDataUrl,
            connectionStatus: "qr_pending"
          })
          await this.updateDbStatus(sessionId, "qr_pending")
          logger.info({ sessionId, qrGenerated: true }, "QR code generated and stored")
        } catch (err) {
          logger.error({ err, sessionId, error: err instanceof Error ? err.message : String(err) }, "Failed to generate QR code")
        }
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const errorMessage = lastDisconnect?.error instanceof Error ? lastDisconnect.error.message : String(lastDisconnect?.error || "")
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        logger.warn(
          {
            sessionId,
            statusCode,
            shouldReconnect,
            errorMessage,
            errorType: lastDisconnect?.error?.constructor?.name,
            lastDisconnectDetail: lastDisconnect?.date,
            socketUser: socket.user?.id
          },
          "WebSocket connection closed - checking persistence"
        )

        if (shouldReconnect) {
          logger.info(
            { sessionId, reconnectDelay: 3000, statusCode },
            "Will attempt to reconnect WebSocket (not logged out)"
          )
          // Attempt reconnection with delay
          this.updateSession(sessionId, {
            connectionStatus: "connecting",
            qrCode: null
          })
          await this.updateDbStatus(sessionId, "connecting")
          setTimeout(() => {
            logger.info({ sessionId }, "Attempting WebSocket reconnection")
            this.connect(sessionId)
          }, 3000)
        } else {
          logger.warn({ sessionId, statusCode, reason: "logged_out" }, "WebSocket closed - logged out, will not reconnect")
          // Logged out - clear auth state
          this.updateSession(sessionId, {
            connectionStatus: "logged_out",
            socket: null,
            qrCode: null
          })
          await this.updateDbStatus(sessionId, "logged_out")
          await this.pool.query(
            "UPDATE whatsapp_sessions SET last_disconnected_at = NOW() WHERE id = $1",
            [sessionId]
          )
        }
      }

      if (connection === "open") {
        const phoneNumber = socket.user?.id?.split(":")[0] || null
        const userId = socket.user?.id
        
        logger.info(
          {
            sessionId,
            phoneNumber,
            userId,
            socketPersistent: true,
            socketUser: socket.user,
            isNewLogin
          },
          "WebSocket connection OPEN - connection is persistent to WhatsApp"
        )

        this.updateSession(sessionId, {
          socket,
          connectionStatus: "connected",
          qrCode: null,
          phoneNumber
        })
        await this.updateDbStatus(sessionId, "connected", phoneNumber)
        await this.pool.query(
          "UPDATE whatsapp_sessions SET last_connected_at = NOW() WHERE id = $1",
          [sessionId]
        )
        logger.info({ sessionId, phoneNumber, persistent: true }, "Connected to WhatsApp - WebSocket is persistent")
      }

      // Log connection state for persistence verification
      if (connection === "connecting") {
        logger.info({ sessionId, connectionState: "connecting" }, "WebSocket is connecting to WhatsApp")
      }
    })

    // Credentials update - important for persistence
    socket.ev.on("creds.update", async () => {
      logger.debug({ sessionId }, "Credentials update event received - saving auth state")
      try {
        await saveCreds()
        logger.info({ sessionId }, "Auth credentials saved successfully")
      } catch (error) {
        logger.error(
          { error, sessionId, errorMessage: error instanceof Error ? error.message : String(error) },
          "Failed to save auth credentials"
        )
      }
    })

    // Message events - comprehensive logging
    socket.ev.on("messages.upsert", async (upsert) => {
      logger.info(
        {
          sessionId,
          messageCount: upsert.messages.length,
          upsertType: upsert.type,
          messages: upsert.messages.map(m => ({
            id: m.key.id,
            remoteJid: m.key.remoteJid,
            fromMe: m.key.fromMe,
            participant: m.key.participant
          }))
        },
        "Messages upsert event received from WhatsApp"
      )

      for (const msg of upsert.messages) {
        const messageType = msg.message ? Object.keys(msg.message)[0] : "unknown"
        const hasProtocolMessage = !!(msg as any).messageStubType || !!(msg as any).protocolMessage
        
        logger.debug(
          {
            sessionId,
            messageId: msg.key.id,
            remoteJid: msg.key.remoteJid,
            fromMe: msg.key.fromMe,
            participant: msg.key.participant,
            messageType,
            upsertType: upsert.type,
            hasMessage: !!msg.message,
            hasProtocolMessage,
            messageStubType: (msg as any).messageStubType,
            // Log full message structure for debugging
            messageStructure: msg.message ? Object.keys(msg.message) : []
          },
          "Processing individual message from upsert"
        )

        // Only process incoming messages that are notifications (not protocol messages or receipts)
        // Protocol messages and receipts don't have user content, so we skip them
        if (!msg.key.fromMe && upsert.type === "notify" && !hasProtocolMessage) {
          logger.info(
            {
              sessionId,
              messageId: msg.key.id,
              remoteJid: msg.key.remoteJid,
              fromMe: false,
              messageType,
              hasMessage: !!msg.message
            },
            "Incoming message detected - routing to message handler"
          )
          await this.messageHandler.handleIncomingMessage(sessionId, msg, socket)
        } else {
          const skipReason = msg.key.fromMe 
            ? "fromMe=true, skipping" 
            : upsert.type !== "notify"
            ? `upsertType=${upsert.type}, only processing 'notify'`
            : hasProtocolMessage
            ? "protocol message or receipt, skipping"
            : "unknown reason"
            
          logger.debug(
            {
              sessionId,
              messageId: msg.key.id,
              fromMe: msg.key.fromMe,
              upsertType: upsert.type,
              hasProtocolMessage,
              reason: skipReason
            },
            "Skipping message (not an incoming notify message)"
          )
        }
      }
    })

    // Store socket reference
    this.updateSession(sessionId, { socket })
    logger.info({ sessionId, socketStored: true }, "Socket reference stored in session")
  }

  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session?.socket) {
      logger.info({ sessionId }, "Disconnecting")
      session.socket.end(undefined)
      this.sessions.delete(sessionId)
      await this.updateDbStatus(sessionId, "disconnected")
      await this.pool.query(
        "UPDATE whatsapp_sessions SET last_disconnected_at = NOW() WHERE id = $1",
        [sessionId]
      )
    }
  }

  /**
   * Reconnect a session (disconnect then connect)
   */
  async reconnect(sessionId: string): Promise<void> {
    logger.info({ sessionId }, "Reconnecting session")

    // Disconnect if currently connected
    const session = this.sessions.get(sessionId)
    if (session?.socket) {
      session.socket.end(undefined)
      this.sessions.delete(sessionId)
    }

    // Small delay before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reconnect
    await this.connect(sessionId)
  }

  async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session?.socket) {
      logger.info({ sessionId }, "Logging out")
      await session.socket.logout()
    }
    await this.authState.clearAuthState(sessionId)
    this.sessions.delete(sessionId)
    await this.updateDbStatus(sessionId, "logged_out")
    await this.pool.query(
      "UPDATE whatsapp_sessions SET phone_number = NULL, last_disconnected_at = NOW() WHERE id = $1",
      [sessionId]
    )
  }

  async sendMessage(
    sessionId: string,
    recipient: string,
    content: string
  ): Promise<{ messageId: string; timestamp: Date }> {
    const session = this.sessions.get(sessionId)
    if (!session?.socket) {
      throw new Error("Not connected")
    }

    if (session.connectionStatus !== "connected") {
      throw new Error(`Connection not ready: ${session.connectionStatus}`)
    }

    // Verify socket is authenticated
    if (!session.socket.user) {
      throw new Error("Socket is not authenticated")
    }

    // Perform connection health check before sending
    try {
      await this.verifyConnectionHealth(sessionId, session.socket)
    } catch (error) {
      logger.warn(
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error)
        },
        "Connection health check failed - will attempt to send anyway"
      )
      // Don't throw - allow the send to proceed as it might still work
    }

    return this.messageHandler.sendTextMessage(sessionId, session.socket, recipient, content)
  }

  /**
   * Verifies the socket connection is healthy by sending a presence update
   * This "warms up" the connection before sending actual messages
   */
  private async verifyConnectionHealth(sessionId: string, socket: WASocket): Promise<void> {
    logger.debug({ sessionId }, "Performing connection health check")

    try {
      // Send a presence update as a lightweight ping to verify connection
      // This is much faster than sending a full message and validates the connection
      await socket.sendPresenceUpdate("available")

      logger.debug({ sessionId }, "Connection health check passed - socket is responsive")
    } catch (error) {
      logger.warn(
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          errorType: error?.constructor?.name
        },
        "Connection health check failed - socket may not be fully ready"
      )
      throw error
    }
  }

  getMessageHandler(): MessageHandler {
    return this.messageHandler
  }

  private updateSession(sessionId: string, updates: Partial<SessionInfo>): void {
    const current = this.sessions.get(sessionId) || {
      socket: null,
      qrCode: null,
      connectionStatus: "disconnected" as ConnectionStatus,
      phoneNumber: null,
      lastError: null
    }
    this.sessions.set(sessionId, { ...current, ...updates })
  }

  private async updateSessionError(sessionId: string, error: string): Promise<void> {
    this.updateSession(sessionId, {
      connectionStatus: "disconnected",
      lastError: error
    })
    await this.updateDbStatus(sessionId, "disconnected")
  }

  private async updateDbStatus(
    sessionId: string,
    status: ConnectionStatus,
    phoneNumber?: string | null
  ): Promise<void> {
    const query = phoneNumber !== undefined
      ? "UPDATE whatsapp_sessions SET connection_status = $1, phone_number = $2, updated_at = NOW() WHERE id = $3"
      : "UPDATE whatsapp_sessions SET connection_status = $1, updated_at = NOW() WHERE id = $2"

    const params = phoneNumber !== undefined
      ? [status, phoneNumber, sessionId]
      : [status, sessionId]

    await this.pool.query(query, params)
  }

  async close(): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      if (session.socket) {
        session.socket.end(undefined)
      }
    }
    this.sessions.clear()
    await this.authState.close()
    await this.pool.end()
  }

  /**
   * Auto-connect all primary sessions that have auth state
   * Called on server startup
   */
  async autoConnectPrimarySessions(): Promise<{
    attempted: number
    connected: number
    failed: string[]
  }> {
    logger.info("Starting auto-connect for primary sessions")

    const result = await this.pool.query(`
      SELECT id, session_name, phone_number
      FROM whatsapp_sessions
      WHERE session_name = 'primary'
        AND auth_state IS NOT NULL
        AND is_active = true
        AND auto_connect = true
    `)

    const sessions = result.rows
    logger.info({ count: sessions.length }, "Found primary sessions to auto-connect")

    const failed: string[] = []
    let connected = 0

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      logger.info(
        { sessionId: session.id, phoneNumber: session.phone_number, index: i + 1, total: sessions.length },
        "Auto-connecting session"
      )

      try {
        await this.connect(session.id)
        connected++
        logger.info({ sessionId: session.id }, "Auto-connect successful")
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        logger.error({ sessionId: session.id, error: errorMsg }, "Auto-connect failed")
        failed.push(session.id)
      }

      // Stagger connections to avoid overwhelming WhatsApp
      if (i < sessions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    logger.info(
      { attempted: sessions.length, connected, failed: failed.length },
      "Auto-connect complete"
    )

    return { attempted: sessions.length, connected, failed }
  }
}
