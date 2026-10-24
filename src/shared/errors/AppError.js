export class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Data tidak valid', errors = []) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Tidak terautentikasi', errors = []) {
    super(message, 401, errors);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak', errors = []) {
    super(message, 403, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan', errors = []) {
    super(message, 404, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Data sudah ada', errors = []) {
    super(message, 409, errors);
  }
}

