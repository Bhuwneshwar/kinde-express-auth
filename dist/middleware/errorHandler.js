"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
// Global Error Middleware
const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500; // Default to 500 if no status code is provided
    const message = err.message || "Internal Server Error";
    console.error(`[Error]: ${message}`);
    res.status(statusCode).json({
        success: false,
        error: message,
    });
};
exports.globalErrorHandler = globalErrorHandler;
