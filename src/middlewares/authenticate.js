import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../shared/errors/AppError.js';

export function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token autentikasi tidak ditemukan'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new UnauthorizedError('Token autentikasi tidak ditemukan'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const userId = Number(payload.sub);

    if (!userId || !payload.role) {
      return next(new UnauthorizedError('Token tidak valid'));
    }

    req.user = {
      id: userId,
      role: payload.role,
    };

    return next();
  } catch {
    return next(new UnauthorizedError('Token tidak valid atau telah kedaluwarsa'));
  }
}

