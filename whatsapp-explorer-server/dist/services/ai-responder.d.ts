interface AiConfig {
    enabled: boolean;
    systemPrompt: string;
    model: string;
}
export declare class AiResponder {
    private configs;
    getConfig(sessionId: string): AiConfig | null;
    setConfig(sessionId: string, config: AiConfig): void;
    /**
     * Validates that an API key is not a placeholder or invalid format
     */
    private validateApiKey;
    generateResponse(message: string, systemPrompt: string, model: string): Promise<string | null>;
    testResponse(testMessage: string, systemPrompt: string, model: string): Promise<{
        success: boolean;
        response?: string;
        error?: string;
        model: string;
        tokensUsed?: number;
    }>;
}
export {};
//# sourceMappingURL=ai-responder.d.ts.map