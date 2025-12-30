import type { ConnectionStatus, SessionInfo } from "./types.js";
import { MessageHandler } from "./message-handler.js";
export declare class ConnectionManager {
    private static instance;
    private sessions;
    private authState;
    private pool;
    private messageHandler;
    private constructor();
    static getInstance(): ConnectionManager;
    getSession(sessionId: string): SessionInfo | undefined;
    getSessionStatus(sessionId: string): Promise<{
        connectionStatus: ConnectionStatus;
        qrCode: string | null;
        phoneNumber: string | null;
        lastError: string | null;
    }>;
    /**
     * Get status of all active sessions (for health check)
     */
    getAllSessionsStatus(): Array<{
        sessionId: string;
        connectionStatus: ConnectionStatus;
        phoneNumber: string | null;
        lastConnectedAt: Date | null;
        socketAlive: boolean;
    }>;
    connect(sessionId: string): Promise<void>;
    private setupEventHandlers;
    disconnect(sessionId: string): Promise<void>;
    /**
     * Reconnect a session (disconnect then connect)
     */
    reconnect(sessionId: string): Promise<void>;
    logout(sessionId: string): Promise<void>;
    sendMessage(sessionId: string, recipient: string, content: string): Promise<{
        messageId: string;
        timestamp: Date;
    }>;
    /**
     * Verifies the socket connection is healthy by sending a presence update
     * This "warms up" the connection before sending actual messages
     */
    private verifyConnectionHealth;
    getMessageHandler(): MessageHandler;
    private updateSession;
    private updateSessionError;
    private updateDbStatus;
    /**
     * Update all active sessions to disconnected status in database
     * Called during graceful shutdown
     */
    updateAllSessionsToDisconnected(): Promise<void>;
    close(): Promise<void>;
    /**
     * Auto-connect all primary sessions that have auth state
     * Called on server startup
     */
    autoConnectPrimarySessions(): Promise<{
        attempted: number;
        connected: number;
        failed: string[];
    }>;
}
//# sourceMappingURL=connection-manager.d.ts.map