import { z } from 'zod';

export const createReviewSchema = z.object({
  orderItemId: z
    .number({
      required_error: 'ID item pesanan wajib diisi',
      invalid_type_error: 'ID item pesanan harus berupa angka',
    })
    .int('ID item pesanan harus berupa bilangan bulat')
    .positive('ID item pesanan harus lebih dari 0'),
  rating: z
    .number({
      required_error: 'Rating wajib diisi',
      invalid_type_error: 'Rating harus berupa angka',
    })
    .int('Rating harus berupa bilangan bulat')
    .min(1, 'Rating minimal 1')
    .max(5, 'Rating maksimal 5'),
  komentar: z
    .string({
      required_error: 'Komentar wajib diisi',
      invalid_type_error: 'Komentar harus berupa teks',
    })
    .trim()
    .min(3, 'Komentar minimal 3 karakter')
    .max(1000, 'Komentar maksimal 1000 karakter'),
});
