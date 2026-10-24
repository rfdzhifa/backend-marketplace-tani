import { AppError } from '../shared/errors/AppError.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Format JSON tidak valid',
      errors: [],
    });
  }

  if (err && err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Data sudah terdaftar',
      errors: [],
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server',
    errors: [],
  });
}

