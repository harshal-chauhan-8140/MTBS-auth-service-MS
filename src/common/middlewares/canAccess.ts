import type { Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import type { AuthRequest } from '../../modules/authentication/types.js';

export const canAccess = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.auth?.role;

    if (!role || !roles.includes(role)) {
      return next(createHttpError(403, 'You are not allowed to access this resource'));
    }

    next();
  };
};

export default canAccess;
