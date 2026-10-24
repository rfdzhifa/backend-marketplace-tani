import { BadRequestError } from '../shared/errors/AppError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const input = req[source] ?? {};
    const result = schema.safeParse(input);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));

      return next(new BadRequestError('Data tidak lengkap atau format tidak valid', errors));
    }

    if (source === 'body') {
      req.body = result.data;
    }

    return next();
  };
}

