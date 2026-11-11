import { z } from 'zod';

const phoneRegex = /^(?:\+?62|0)8[0-9]{7,13}$/;

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

