import OpenAI from "openai";
import { createLogger } from "../utils/logger.js";
import { env } from "../config/env.js";
const logger = createLogger("ai-responder");
export class AiResponder {
    configs = new Map();
    getConfig(sessionId) {
        return this.configs.get(sessionId) || null;
    }
    setConfig(sessionId, config) {
        this.configs.set(sessionId, config);
        logger.info({ sessionId, enabled: config.enabled }, "AI config updated");
    }
    /**
     * Validates that an API key is not a placeholder or invalid format
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== "string") {
            return { valid: false, error: "API key is required" };
        }
        const trimmed = apiKey.trim();
        // Check for empty string
        if (trimmed.length === 0) {
            return { valid: false, error: "API key cannot be empty" };
        }
        // Check for common placeholder patterns
        const placeholderPatterns = [
            /^sk-your-/i,
            /^sk-\.\.\./i,
            /^sk-\*+/i,
            /sk-.*here$/i,
            /^your.*api.*key$/i,
            /^sk-.*example/i,
            /^sk-.*placeholder/i,
            /^sk-.*replace/i
        ];
        for (const pattern of placeholderPatterns) {
            if (pattern.test(trimmed)) {
                return {
                    valid: false,
                    error: "Invalid API key: appears to be a placeholder. Please provide a real OpenAI API key."
                };
            }
        }
        // Check for minimum length (OpenAI API keys are typically at least 20 chars)
        if (trimmed.length < 20) {
            return {
                valid: false,
                error: "API key appears to be too short. OpenAI API keys should be at least 20 characters."
            };
        }
        // Check that it starts with sk- (OpenAI format)
        if (!trimmed.startsWith("sk-")) {
            return {
                valid: false,
                error: "Invalid API key format. OpenAI API keys should start with 'sk-'"
            };
        }
        return { valid: true };
    }
    async generateResponse(message, systemPrompt, model) {
        // Use API key from environment variable
        const apiKey = env.openaiApiKey;
        // Validate API key
        const validation = this.validateApiKey(apiKey);
        if (!validation.valid) {
            logger.warn({ error: validation.error }, "Invalid OpenAI API key in environment");
            return null;
        }
        try {
            const openai = new OpenAI({ apiKey });
            const modelName = model || "gpt-4";
            // Newer models (GPT-4o, GPT-5.x, etc.) use max_completion_tokens instead of max_tokens
            const useMaxCompletionTokens = modelName.startsWith("gpt-4o") ||
                modelName.startsWith("gpt-5") ||
                modelName.includes("o1") ||
                modelName.includes("2025");
            const completionParams = {
                model: modelName,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt || "You are a helpful assistant responding to WhatsApp messages. Keep responses concise and friendly."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7
            };
            // Use the appropriate parameter based on model version
            if (useMaxCompletionTokens) {
                completionParams.max_completion_tokens = 500;
            }
            else {
                completionParams.max_tokens = 500;
            }
            const completion = await openai.chat.completions.create(completionParams);
            const response = completion.choices[0]?.message?.content;
            logger.info({ messageLength: message.length, responseLength: response?.length }, "AI response generated");
            return response || null;
        }
        catch (error) {
            // Extract meaningful error message
            let errorMessage = "Failed to generate AI response";
            if (error?.status === 401 || error?.code === "invalid_api_key") {
                errorMessage = "Invalid OpenAI API key. Please check your API key and try again.";
            }
            else if (error?.message) {
                errorMessage = error.message;
            }
            logger.error({
                error,
                errorMessage,
                status: error?.status,
                code: error?.code,
                apiKeyPrefix: apiKey.substring(0, 7) + "..." // Only log prefix for security
            }, "Failed to generate AI response");
            throw new Error(errorMessage);
        }
    }
    async testResponse(testMessage, systemPrompt, model) {
        // Use API key from environment variable
        const apiKey = env.openaiApiKey;
        // Validate API key
        const validation = this.validateApiKey(apiKey);
        if (!validation.valid) {
            logger.warn({ error: validation.error }, "Invalid OpenAI API key in environment for test");
            return {
                success: false,
                error: validation.error || "Invalid API key in environment. Please set OPENAI_API_KEY in .env file.",
                model
            };
        }
        try {
            const openai = new OpenAI({ apiKey });
            const modelName = model || "gpt-4";
            // Newer models (GPT-4o, GPT-5.x, etc.) use max_completion_tokens instead of max_tokens
            const useMaxCompletionTokens = modelName.startsWith("gpt-4o") ||
                modelName.startsWith("gpt-5") ||
                modelName.includes("o1") ||
                modelName.includes("2025");
            const completionParams = {
                model: modelName,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt || "You are a helpful assistant."
                    },
                    {
                        role: "user",
                        content: testMessage
                    }
                ],
                temperature: 0.7
            };
            // Use the appropriate parameter based on model version
            if (useMaxCompletionTokens) {
                completionParams.max_completion_tokens = 500;
            }
            else {
                completionParams.max_tokens = 500;
            }
            const completion = await openai.chat.completions.create(completionParams);
            return {
                success: true,
                response: completion.choices[0]?.message?.content || "",
                model: completion.model,
                tokensUsed: completion.usage?.total_tokens
            };
        }
        catch (error) {
            // Extract meaningful error message
            let errorMessage = "Unknown error";
            if (error?.status === 401 || error?.code === "invalid_api_key") {
                errorMessage = "Invalid OpenAI API key. Please check your API key and try again.";
            }
            else if (error?.error?.message) {
                errorMessage = error.error.message;
            }
            else if (error?.message) {
                errorMessage = error.message;
            }
            logger.error({
                error,
                errorMessage,
                status: error?.status,
                code: error?.code,
                apiKeyPrefix: apiKey.substring(0, 7) + "..." // Only log prefix for security
            }, "AI test failed");
            return {
                success: false,
                error: errorMessage,
                model
            };
        }
    }
}
//# sourceMappingURL=ai-responder.js.map