import 'dotenv/config';

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-marketplace-tani-jwt-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  BCRYPT_COST: Number(process.env.BCRYPT_COST) || 10,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
});

