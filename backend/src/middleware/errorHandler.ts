import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode = 400, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.errors);
  }

  if (err instanceof ZodError) {
    const formattedErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || 'root';
      if (!formattedErrors[field]) {
        formattedErrors[field] = [];
      }
      formattedErrors[field].push(issue.message);
    }
    return sendError(res, 'Validation failed. Please check your inputs.', 422, 'VALIDATION_ERROR', formattedErrors);
  }

  console.error('âŒ Unhandled Server Error:', err);

  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message || 'An internal server error occurred.';

  return sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
};
