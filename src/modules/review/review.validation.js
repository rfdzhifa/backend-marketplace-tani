import { z } from 'zod';

const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const productIdParamSchema = z.object({
  id: integerString('ID produk harus berupa bilangan bulat positif').pipe(
    z.number().int().min(1, 'ID produk harus berupa bilangan bulat positif'),
  ),
});

export const reviewListQuerySchema = z.object({
  page: integerString('Page harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Page minimal 1'))
    .default(1),
  limit: integerString('Limit harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Limit minimal 1').max(50, 'Limit maksimal 50'))
    .default(10),
});

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
