import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { Pool } from "pg";
import type { StoredMessage } from "./types.js";
import { AiResponder } from "../services/ai-responder.js";
export declare class MessageHandler {
    private pool;
    private aiResponder;
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
    getAiConfig(sessionId: string): Promise<{
        enabled: boolean;
        systemPrompt: string;
        model: string;
    } | null>;
    updateAiConfig(sessionId: string, config: {
        enabled: boolean;
        systemPrompt: string;
        model: string;
    }): Promise<void>;
    getAiResponder(): AiResponder;
}
//# sourceMappingURL=message-handler.d.ts.map