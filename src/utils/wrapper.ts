import type { NextFunction, Request, RequestHandler, Response } from 'express';
import createHttpError from 'http-errors';

export const asyncWrapper = (requestHandler: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      if (createHttpError.isHttpError(err)) {
        return next(err);
      }

      if (err instanceof Error) {
        return next(createHttpError(500, err.message));
      }

      return next(createHttpError(500, 'Internal server error.'));
    });
  };
};
