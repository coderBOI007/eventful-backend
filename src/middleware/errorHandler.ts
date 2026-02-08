import { Request, Response, NextFunction } from "express";

/**
 * Custom application error.
 * Throw this anywhere in a route/service to produce a structured JSON response.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps an async route handler so that rejected promises are forwarded
 * to Express's error-handling middleware automatically.
 *
 * Usage:
 *   router.get("/events", asyncHandler(eventController.list));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Express error-handling middleware.  Must be registered LAST on the app.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }

  // Unexpected errors — never leak stack traces to clients
  console.error("[Unhandled Error]", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: "Something went wrong. Please try again later.",
  });
}