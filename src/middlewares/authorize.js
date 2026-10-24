import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Tidak terautentikasi'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Anda tidak memiliki akses untuk fitur ini'));
    }

    return next();
  };
}

