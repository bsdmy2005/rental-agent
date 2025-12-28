import { createLogger } from "../utils/logger.js";
const logger = createLogger("error-handler");
export function errorHandler(err, req, res, _next) {
    // Handle Boom errors (used by Baileys)
    let statusCode = 500;
    let message = "Internal server error";
    if (err.isBoom && err.output) {
        statusCode = err.output.statusCode || 500;
        message = err.output.payload?.message || err.message || "Internal server error";
    }
    else {
        statusCode = err.statusCode || 500;
        message = err.message || "Internal server error";
    }
    logger.error({ err, path: req.path, method: req.method }, "Request error");
    res.status(statusCode).json({
        error: message,
        code: err.code,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    });
}
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: "Not found",
        path: req.path
    });
}
//# sourceMappingURL=error-handler.js.map