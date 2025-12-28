import type { Request, Response, NextFunction } from "express";
export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    output?: {
        statusCode?: number;
        payload?: {
            message?: string;
        };
    };
    isBoom?: boolean;
}
export declare function errorHandler(err: ApiError, req: Request, res: Response, _next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
//# sourceMappingURL=error-handler.d.ts.map