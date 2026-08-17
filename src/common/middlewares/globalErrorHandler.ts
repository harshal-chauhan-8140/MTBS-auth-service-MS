import { HttpError } from 'http-errors';
import { v4 as uuidv4 } from 'uuid';
import type { NextFunction, Request, Response } from 'express';

export const globalErrorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const errorId = uuidv4();

  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? `An unexpected error occurred.` : err.message;

  console.error(err.message, {
    id: errorId,
    error: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    errors: [
      {
        ref: errorId,
        type: err.name,
        msg: message,
        path: req.path,
        location: 'server',
        stack: isProduction ? null : err.stack,
      },
    ],
  });
};
