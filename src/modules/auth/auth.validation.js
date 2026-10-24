import { z } from 'zod';
import { ROLES } from '../../shared/constants/roles.js';

const indonesianPhoneRegex = /^(?:08[0-9]{8,13}|628[0-9]{7,12}|\+628[0-9]{7,13})$/;
const passwordComplexityRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const nameField = z
  .string({ message: 'Nama wajib diisi' })
  .trim()
  .min(2, 'Nama minimal 2 karakter')
  .max(100, 'Nama maksimal 100 karakter');

const phoneField = z
  .string({ message: 'Nomor telepon wajib diisi' })
  .trim()
  .regex(indonesianPhoneRegex, 'Format nomor telepon Indonesia tidak valid (10-15 digit, diawali 08, 628, atau +628)');

export const registerSchema = z.object({
  name: nameField,
  email: z
    .string({ message: 'Email wajib diisi' })
    .trim()
    .toLowerCase()
    .min(1, 'Email wajib diisi')
    .max(100, 'Email maksimal 100 karakter')
    .email('Format email tidak valid'),
  phone: phoneField,
  password: z
    .string({ message: 'Password wajib diisi' })
    .min(8, 'Password minimal 8 karakter')
    .regex(passwordComplexityRegex, 'Password harus mengandung huruf dan angka'),
  role: z.enum([ROLES.BUYER, ROLES.SELLER], {
    message: 'Role harus BUYER atau SELLER',
  }),
});

export const loginSchema = z.object({
  email: z
    .string({ message: 'Email wajib diisi' })
    .trim()
    .toLowerCase()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string({ message: 'Password wajib diisi' })
    .min(1, 'Password wajib diisi'),
});

export const updateProfileSchema = z.object({
  name: nameField,
  phone: phoneField,
});