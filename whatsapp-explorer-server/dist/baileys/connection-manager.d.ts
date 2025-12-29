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
    connect(sessionId: string): Promise<void>;
    private setupEventHandlers;
    disconnect(sessionId: string): Promise<void>;
    logout(sessionId: string): Promise<void>;
    sendMessage(sessionId: string, recipient: string, content: string): Promise<{
        messageId: string;
        timestamp: Date;
    }>;
    private verifyConnectionHealth;
    getMessageHandler(): MessageHandler;
    private updateSession;
    private updateSessionError;
    private updateDbStatus;
    close(): Promise<void>;
}
//# sourceMappingURL=connection-manager.d.ts.map