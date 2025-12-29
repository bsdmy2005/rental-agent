import type { WASocket } from "@whiskeysockets/baileys";
export type ConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected" | "logged_out";
export interface SessionInfo {
    socket: WASocket | null;
    qrCode: string | null;
    connectionStatus: ConnectionStatus;
    phoneNumber: string | null;
    lastError: string | null;
}
export interface MessageResult {
    messageId: string;
    status: string;
    timestamp: Date;
}
export interface StoredMessage {
    id: string;
    sessionId: string;
    messageId: string;
    remoteJid: string;
    fromMe: boolean;
    messageType: string;
    content: string | null;
    mediaUrl: string | null;
    status: string | null;
    timestamp: Date;
}
export interface AuthStateData {
    creds: any;
    keys: Record<string, any>;
}
//# sourceMappingURL=types.d.ts.map