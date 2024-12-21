import { Request, Response, NextFunction } from "express";

// Custom error interface for better type safety
interface AppError extends Error {
  statusCode?: number;
}

// Global Error Middleware
export const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500; // Default to 500 if no status code is provided
  const message = err.message || "Internal Server Error";

  console.error(`[Error]: ${message}`);

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
