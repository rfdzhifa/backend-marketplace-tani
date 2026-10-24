import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_COST);
}

export async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

