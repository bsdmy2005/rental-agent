import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { Pool } from "pg";
import type { StoredMessage } from "./types.js";
export declare class MessageHandler {
    private pool;
    constructor(pool: Pool);
    sendTextMessage(sessionId: string, socket: WASocket, recipient: string, content: string, retryAttempts?: number, retryDelayMs?: number): Promise<{
        messageId: string;
        timestamp: Date;
    }>;
    handleIncomingMessage(sessionId: string, msg: WAMessage, socket: WASocket): Promise<void>;
    private extractMessageContent;
    private getMessageType;
    private storeMessage;
    getMessages(sessionId: string, limit?: number, offset?: number): Promise<StoredMessage[]>;
    /**
     * Process message through conversation state machine
     * Replaces the old incident-only detection with a full conversation flow
     * that handles greetings, property identification, incident details, and confirmations
     */
    private processConversation;
    /**
     * Handle incident if message appears to be an incident report
     * @deprecated Use processConversation instead - kept for backwards compatibility
     * Returns true if incident was handled, false otherwise
     */
    private handleIncidentIfApplicable;
}
//# sourceMappingURL=message-handler.d.ts.map