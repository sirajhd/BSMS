import type { Request, Response } from 'express';
import { sendError } from '../utils/response.js';

export const notFoundHandler = (req: Request, res: Response) => {
  return sendError(
    res,
    `Route ${req.method} ${req.originalUrl} not found on this server.`,
    404,
    'NOT_FOUND'
  );
};
