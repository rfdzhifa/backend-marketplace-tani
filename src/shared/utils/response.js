export function sendSuccess(res, { statusCode = 200, message = 'Berhasil', data = null, meta = undefined }) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

