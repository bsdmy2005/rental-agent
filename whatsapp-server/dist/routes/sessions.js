import { Router } from "express";
import { ConnectionManager } from "../baileys/connection-manager.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("routes/sessions");
const router = Router();
// Get session status
router.get("/:sessionId/status", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const manager = ConnectionManager.getInstance();
        const status = await manager.getSessionStatus(sessionId);
        res.json({
            sessionId,
            ...status
        });
    }
    catch (error) {
        next(error);
    }
});
// Connect session
router.post("/:sessionId/connect", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const manager = ConnectionManager.getInstance();
        logger.info({ sessionId }, "Connect request received");
        // Validate primary session if this is incident-dispatch server
        const { env } = await import("../config/env.js");
        if (env.serviceType === "incident-dispatch") {
            const { Pool } = await import("pg");
            const pool = new Pool({ connectionString: env.databaseUrl });
            const result = await pool.query("SELECT session_name FROM whatsapp_sessions WHERE id = $1", [sessionId]);
            await pool.end();
            if (!result.rows[0]) {
                return res.status(404).json({
                    success: false,
                    message: `Session ${sessionId} not found`
                });
            }
            const sessionName = result.rows[0].session_name;
            if (sessionName !== "primary") {
                logger.warn({ sessionId, sessionName }, "Rejecting connection: Only primary sessions allowed");
                return res.status(403).json({
                    success: false,
                    message: `This server only accepts primary sessions. Session '${sessionName}' is not allowed.`
                });
            }
        }
        await manager.connect(sessionId);
        res.json({
            success: true,
            message: "Connection initiated. Check status for QR code.",
            sessionId
        });
    }
    catch (error) {
        next(error);
    }
});
// Disconnect session
router.post("/:sessionId/disconnect", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const manager = ConnectionManager.getInstance();
        logger.info({ sessionId }, "Disconnect request received");
        await manager.disconnect(sessionId);
        res.json({
            success: true,
            message: "Disconnected",
            sessionId
        });
    }
    catch (error) {
        next(error);
    }
});
// Logout session (clears auth state)
router.post("/:sessionId/logout", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const manager = ConnectionManager.getInstance();
        logger.info({ sessionId }, "Logout request received");
        await manager.logout(sessionId);
        res.json({
            success: true,
            message: "Logged out and auth state cleared",
            sessionId
        });
    }
    catch (error) {
        next(error);
    }
});
// Reconnect session (disconnect and reconnect)
router.post("/:sessionId/reconnect", async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const manager = ConnectionManager.getInstance();
        logger.info({ sessionId }, "Reconnect request received");
        await manager.reconnect(sessionId);
        res.json({
            success: true,
            message: "Reconnection initiated",
            sessionId
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=sessions.js.map