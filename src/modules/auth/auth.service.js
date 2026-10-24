import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError.js';
import { comparePassword, hashPassword } from '../../shared/utils/hash.js';
import { authRepository } from './auth.repository.js';

const INVALID_CREDENTIALS_MESSAGE = 'Email atau password salah';

export const authService = {
  async register({ name, email, phone, password, role }) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await authRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError('Email sudah terdaftar', [
        { field: 'email', message: 'Email sudah terdaftar' },
      ]);
    }

    const passwordHash = await hashPassword(password);

    return authRepository.create({
      name,
      email: normalizedEmail,
      phone,
      passwordHash,
      role,
    });
  },

  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase();
    const userWithHash = await authRepository.findByEmail(normalizedEmail);

    if (!userWithHash) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await comparePassword(password, userWithHash.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const { password_hash: _removed, ...user } = userWithHash;

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN },
    );

    return { token, user };
  },

  async getProfile(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Pengguna tidak ditemukan');
    }
    return user;
  },

  async updateProfile(userId, { name, phone }) {
    const existing = await authRepository.findById(userId);
    if (!existing) {
      throw new UnauthorizedError('Pengguna tidak ditemukan');
    }

    return authRepository.updateProfile(userId, { name, phone });
  },
};

