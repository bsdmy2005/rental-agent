import { Router } from "express";
import { ConnectionManager } from "../baileys/connection-manager.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("routes/ai");
const router = Router();
// Get AI config
router.get("/:sessionId/ai-config", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const manager = ConnectionManager.getInstance();
        const messageHandler = manager.getMessageHandler();
        const config = await messageHandler.getAiConfig(sessionId);
        res.json({
            sessionId,
            config: config
                ? {
                    enabled: config.enabled,
                    systemPrompt: config.systemPrompt,
                    model: config.model,
                    // API key is stored in .env file, not in config
                    apiKeySource: "environment"
                }
                : null
        });
    }
    catch (error) {
        next(error);
    }
});
// Update AI config
router.put("/:sessionId/ai-config", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { enabled, systemPrompt, model } = req.body;
        const manager = ConnectionManager.getInstance();
        const messageHandler = manager.getMessageHandler();
        await messageHandler.updateAiConfig(sessionId, {
            enabled: !!enabled,
            systemPrompt: systemPrompt || "",
            model: model || "gpt-4"
        });
        logger.info({ sessionId, enabled }, "AI config updated (API key is read from .env file)");
        res.json({
            success: true,
            message: "AI configuration updated. Note: OpenAI API key is read from .env file, not from request body.",
            sessionId
        });
    }
    catch (error) {
        next(error);
    }
});
// Test AI response
router.post("/:sessionId/test-ai", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const { testMessage, systemPrompt, model } = req.body;
        if (!testMessage) {
            res.status(400).json({ error: "testMessage is required" });
            return;
        }
        const manager = ConnectionManager.getInstance();
        const messageHandler = manager.getMessageHandler();
        const aiResponder = messageHandler.getAiResponder();
        // API key is read from .env file, not from request body
        const result = await aiResponder.testResponse(testMessage, systemPrompt || "You are a helpful assistant responding to WhatsApp messages.", model || "gpt-4");
        res.json({
            sessionId,
            ...result
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=ai.js.map