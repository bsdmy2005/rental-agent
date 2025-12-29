import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { PostgresAuthState } from "./auth-state.js";
import { createLogger } from "../utils/logger.js";
import { MessageHandler } from "./message-handler.js";
import { Pool } from "pg";
import { env } from "../config/env.js";
const logger = createLogger("connection-manager");
export class ConnectionManager {
    static instance;
    sessions = new Map();
    authState;
    pool;
    messageHandler;
    constructor() {
        this.authState = new PostgresAuthState();
        this.pool = new Pool({ connectionString: env.databaseUrl });
        this.messageHandler = new MessageHandler(this.pool);
    }
    static getInstance() {
        if (!ConnectionManager.instance) {
            ConnectionManager.instance = new ConnectionManager();
        }
        return ConnectionManager.instance;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    async getSessionStatus(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            return {
                connectionStatus: session.connectionStatus,
                qrCode: session.qrCode,
                phoneNumber: session.phoneNumber,
                lastError: session.lastError
            };
        }
        // Check database for status
        const result = await this.pool.query("SELECT connection_status, phone_number FROM whatsapp_sessions WHERE id = $1", [sessionId]);
        if (result.rows[0]) {
            return {
                connectionStatus: result.rows[0].connection_status || "disconnected",
                qrCode: null,
                phoneNumber: result.rows[0].phone_number,
                lastError: null
            };
        }
        return {
            connectionStatus: "disconnected",
            qrCode: null,
            phoneNumber: null,
            lastError: null
        };
    }
    async connect(sessionId) {
        logger.info({ sessionId }, "Starting connection");
        // Explorer server accepts all sessions (no filtering)
        // Check if already connected
        const existing = this.sessions.get(sessionId);
        if (existing?.socket && existing.connectionStatus === "connected") {
            logger.info({ sessionId }, "Already connected");
            return;
        }
        // Initialize session info
        this.sessions.set(sessionId, {
            socket: null,
            qrCode: null,
            connectionStatus: "connecting",
            phoneNumber: null,
            lastError: null
        });
        await this.updateDbStatus(sessionId, "connecting");
        try {
            const { version } = await fetchLatestBaileysVersion();
            logger.info({ version }, "Using Baileys version");
            const { state, saveCreds } = await this.authState.getAuthState(sessionId);
            logger.debug({ sessionId, hasCreds: !!state.creds, hasKeys: !!state.keys }, "Creating Baileys socket");
            const socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger)
                },
                printQRInTerminal: false,
                logger: logger.child({ level: "debug" }),
                defaultQueryTimeoutMs: env.baileysTimeoutMs
            });
            logger.info({ sessionId, socketCreated: true }, "Baileys socket created");
            this.setupEventHandlers(sessionId, socket, saveCreds);
        }
        catch (error) {
            logger.error({ error, sessionId }, "Failed to start connection");
            await this.updateSessionError(sessionId, error instanceof Error ? error.message : "Connection failed");
            throw error;
        }
    }
    setupEventHandlers(sessionId, socket, saveCreds) {
        logger.info({ sessionId }, "Setting up WebSocket event handlers");
        socket.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin } = update;
            logger.debug({
                sessionId,
                connection,
                isNewLogin,
                hasQr: !!qr,
                hasLastDisconnect: !!lastDisconnect,
                socketUser: socket.user?.id,
                socketConnected: socket.user !== undefined
            }, "Connection update received");
            if (connection) {
                logger.info({
                    sessionId,
                    connectionState: connection,
                    previousState: this.sessions.get(sessionId)?.connectionStatus,
                    socketUser: socket.user?.id,
                    socketExists: !!socket
                }, `WebSocket connection state changed to: ${connection}`);
            }
            if (qr) {
                logger.info({ sessionId, qrLength: qr.length }, "QR code received from WhatsApp");
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr, { width: 256 });
                    this.updateSession(sessionId, {
                        qrCode: qrDataUrl,
                        connectionStatus: "qr_pending"
                    });
                    await this.updateDbStatus(sessionId, "qr_pending");
                    logger.info({ sessionId, qrGenerated: true }, "QR code generated and stored");
                }
                catch (err) {
                    logger.error({ err, sessionId, error: err instanceof Error ? err.message : String(err) }, "Failed to generate QR code");
                }
            }
            if (connection === "close") {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMessage = lastDisconnect?.error instanceof Error ? lastDisconnect.error.message : String(lastDisconnect?.error || "");
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                logger.warn({
                    sessionId,
                    statusCode,
                    shouldReconnect,
                    errorMessage,
                    errorType: lastDisconnect?.error?.constructor?.name,
                    lastDisconnectDetail: lastDisconnect?.date,
                    socketUser: socket.user?.id
                }, "WebSocket connection closed - checking persistence");
                if (shouldReconnect) {
                    logger.info({ sessionId, reconnectDelay: 3000, statusCode }, "Will attempt to reconnect WebSocket (not logged out)");
                    this.updateSession(sessionId, {
                        connectionStatus: "connecting",
                        qrCode: null
                    });
                    await this.updateDbStatus(sessionId, "connecting");
                    setTimeout(() => {
                        logger.info({ sessionId }, "Attempting WebSocket reconnection");
                        this.connect(sessionId);
                    }, 3000);
                }
                else {
                    logger.warn({ sessionId, statusCode, reason: "logged_out" }, "WebSocket closed - logged out, will not reconnect");
                    this.updateSession(sessionId, {
                        connectionStatus: "logged_out",
                        socket: null,
                        qrCode: null
                    });
                    await this.updateDbStatus(sessionId, "logged_out");
                    await this.pool.query("UPDATE whatsapp_sessions SET last_disconnected_at = NOW() WHERE id = $1", [sessionId]);
                }
            }
            if (connection === "open") {
                const phoneNumber = socket.user?.id?.split(":")[0] || null;
                const userId = socket.user?.id;
                logger.info({
                    sessionId,
                    phoneNumber,
                    userId,
                    socketPersistent: true,
                    socketUser: socket.user,
                    isNewLogin
                }, "WebSocket connection OPEN - connection is persistent to WhatsApp");
                this.updateSession(sessionId, {
                    socket,
                    connectionStatus: "connected",
                    qrCode: null,
                    phoneNumber
                });
                await this.updateDbStatus(sessionId, "connected", phoneNumber);
                await this.pool.query("UPDATE whatsapp_sessions SET last_connected_at = NOW() WHERE id = $1", [sessionId]);
                logger.info({ sessionId, phoneNumber, persistent: true }, "Connected to WhatsApp - WebSocket is persistent");
            }
            if (connection === "connecting") {
                logger.info({ sessionId, connectionState: "connecting" }, "WebSocket is connecting to WhatsApp");
            }
        });
        socket.ev.on("creds.update", async () => {
            logger.debug({ sessionId }, "Credentials update event received - saving auth state");
            try {
                await saveCreds();
                logger.info({ sessionId }, "Auth credentials saved successfully");
            }
            catch (error) {
                logger.error({ error, sessionId, errorMessage: error instanceof Error ? error.message : String(error) }, "Failed to save auth credentials");
            }
        });
        socket.ev.on("messages.upsert", async (upsert) => {
            logger.info({
                sessionId,
                messageCount: upsert.messages.length,
                upsertType: upsert.type,
                messages: upsert.messages.map(m => ({
                    id: m.key.id,
                    remoteJid: m.key.remoteJid,
                    fromMe: m.key.fromMe,
                    participant: m.key.participant
                }))
            }, "Messages upsert event received from WhatsApp");
            for (const msg of upsert.messages) {
                const messageType = msg.message ? Object.keys(msg.message)[0] : "unknown";
                const hasProtocolMessage = !!msg.messageStubType || !!msg.protocolMessage;
                logger.debug({
                    sessionId,
                    messageId: msg.key.id,
                    remoteJid: msg.key.remoteJid,
                    fromMe: msg.key.fromMe,
                    participant: msg.key.participant,
                    messageType,
                    upsertType: upsert.type,
                    hasMessage: !!msg.message,
                    hasProtocolMessage,
                    messageStubType: msg.messageStubType,
                    messageStructure: msg.message ? Object.keys(msg.message) : []
                }, "Processing individual message from upsert");
                if (!msg.key.fromMe && upsert.type === "notify" && !hasProtocolMessage) {
                    logger.info({
                        sessionId,
                        messageId: msg.key.id,
                        remoteJid: msg.key.remoteJid,
                        fromMe: false,
                        messageType,
                        hasMessage: !!msg.message
                    }, "Incoming message detected - routing to message handler");
                    await this.messageHandler.handleIncomingMessage(sessionId, msg, socket);
                }
                else {
                    const skipReason = msg.key.fromMe
                        ? "fromMe=true, skipping"
                        : upsert.type !== "notify"
                            ? `upsertType=${upsert.type}, only processing 'notify'`
                            : hasProtocolMessage
                                ? "protocol message or receipt, skipping"
                                : "unknown reason";
                    logger.debug({
                        sessionId,
                        messageId: msg.key.id,
                        fromMe: msg.key.fromMe,
                        upsertType: upsert.type,
                        hasProtocolMessage,
                        reason: skipReason
                    }, "Skipping message (not an incoming notify message)");
                }
            }
        });
        this.updateSession(sessionId, { socket });
        logger.info({ sessionId, socketStored: true }, "Socket reference stored in session");
    }
    async disconnect(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session?.socket) {
            logger.info({ sessionId }, "Disconnecting");
            session.socket.end(undefined);
            this.sessions.delete(sessionId);
            await this.updateDbStatus(sessionId, "disconnected");
            await this.pool.query("UPDATE whatsapp_sessions SET last_disconnected_at = NOW() WHERE id = $1", [sessionId]);
        }
    }
    async logout(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session?.socket) {
            logger.info({ sessionId }, "Logging out");
            await session.socket.logout();
        }
        await this.authState.clearAuthState(sessionId);
        this.sessions.delete(sessionId);
        await this.updateDbStatus(sessionId, "logged_out");
        await this.pool.query("UPDATE whatsapp_sessions SET phone_number = NULL, last_disconnected_at = NOW() WHERE id = $1", [sessionId]);
    }
    async sendMessage(sessionId, recipient, content) {
        const session = this.sessions.get(sessionId);
        if (!session?.socket) {
            throw new Error("Not connected");
        }
        if (session.connectionStatus !== "connected") {
            throw new Error(`Connection not ready: ${session.connectionStatus}`);
        }
        if (!session.socket.user) {
            throw new Error("Socket is not authenticated");
        }
        try {
            await this.verifyConnectionHealth(sessionId, session.socket);
        }
        catch (error) {
            logger.warn({
                sessionId,
                error: error instanceof Error ? error.message : String(error)
            }, "Connection health check failed - will attempt to send anyway");
        }
        return this.messageHandler.sendTextMessage(sessionId, session.socket, recipient, content);
    }
    async verifyConnectionHealth(sessionId, socket) {
        logger.debug({ sessionId }, "Performing connection health check");
        try {
            await socket.sendPresenceUpdate("available");
            logger.debug({ sessionId }, "Connection health check passed - socket is responsive");
        }
        catch (error) {
            logger.warn({
                sessionId,
                error: error instanceof Error ? error.message : String(error),
                errorType: error?.constructor?.name
            }, "Connection health check failed - socket may not be fully ready");
            throw error;
        }
    }
    getMessageHandler() {
        return this.messageHandler;
    }
    updateSession(sessionId, updates) {
        const current = this.sessions.get(sessionId) || {
            socket: null,
            qrCode: null,
            connectionStatus: "disconnected",
            phoneNumber: null,
            lastError: null
        };
        this.sessions.set(sessionId, { ...current, ...updates });
    }
    async updateSessionError(sessionId, error) {
        this.updateSession(sessionId, {
            connectionStatus: "disconnected",
            lastError: error
        });
        await this.updateDbStatus(sessionId, "disconnected");
    }
    async updateDbStatus(sessionId, status, phoneNumber) {
        const query = phoneNumber !== undefined
            ? "UPDATE whatsapp_sessions SET connection_status = $1, phone_number = $2, updated_at = NOW() WHERE id = $3"
            : "UPDATE whatsapp_sessions SET connection_status = $1, updated_at = NOW() WHERE id = $2";
        const params = phoneNumber !== undefined
            ? [status, phoneNumber, sessionId]
            : [status, sessionId];
        await this.pool.query(query, params);
    }
    async close() {
        for (const [sessionId, session] of this.sessions) {
            if (session.socket) {
                session.socket.end(undefined);
            }
        }
        this.sessions.clear();
        await this.authState.close();
        await this.pool.end();
    }
}
//# sourceMappingURL=connection-manager.js.map