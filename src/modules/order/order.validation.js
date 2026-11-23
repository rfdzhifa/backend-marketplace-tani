import { z } from 'zod';

const phoneRegex = /^(?:\+?62|0)8[0-9]{7,13}$/;
const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const ORDER_STATUS_VALUES = [
  'MENUNGGU_PEMBAYARAN',
  'DIBAYAR',
  'DIPROSES',
  'DIKIRIM',
  'SELESAI',
  'DIBATALKAN',
];

export const orderIdParamSchema = z.object({
  id: integerString('ID pesanan harus berupa bilangan bulat positif').pipe(
    z.number().int().min(1, 'ID pesanan harus berupa bilangan bulat positif'),
  ),
});

export const orderListQuerySchema = z.object({
  page: integerString('Page harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Page minimal 1'))
    .default(1),
  limit: integerString('Limit harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Limit minimal 1').max(50, 'Limit maksimal 50'))
    .default(10),
  status: z
    .enum(ORDER_STATUS_VALUES, {
      errorMap: () => ({ message: 'Status pesanan tidak valid' }),
    })
    .optional(),
});

export const checkoutSchema = z.object({
  namaPenerima: z
    .string({ required_error: 'Nama penerima wajib diisi', invalid_type_error: 'Nama penerima harus berupa string' })
    .trim()
    .min(3, 'Nama penerima minimal 3 karakter')
    .max(100, 'Nama penerima maksimal 100 karakter'),
  noTelepon: z
    .string({ invalid_type_error: 'Nomor telepon harus berupa string' })
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Format nomor telepon tidak valid',
    }),
  alamatPengiriman: z
    .string({ required_error: 'Alamat pengiriman wajib diisi', invalid_type_error: 'Alamat pengiriman harus berupa string' })
    .trim()
    .min(10, 'Alamat pengiriman minimal 10 karakter'),
  catatan: z
    .string({ invalid_type_error: 'Catatan harus berupa string' })
    .trim()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional()
    .nullable(),
});

