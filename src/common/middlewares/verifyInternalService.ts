import type { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { config } from '../../config/index.js';

export const verifyInternalService = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-internal-service-key'];

  if (key !== config.INTERNAL_SERVICE_SECRET) {
    return next(createHttpError(401, 'Not authorized to call this internal endpoint'));
  }

  next();
};

export default verifyInternalService;
