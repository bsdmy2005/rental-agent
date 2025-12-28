import { env } from "../config/env.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("auth");
export function apiKeyAuth(req, res, next) {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
        logger.warn("Request without API key");
        res.status(401).json({ error: "API key required" });
        return;
    }
    if (apiKey !== env.apiKey) {
        logger.warn("Invalid API key provided");
        res.status(403).json({ error: "Invalid API key" });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map