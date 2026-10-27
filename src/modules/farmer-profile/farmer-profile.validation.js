import { z } from 'zod';

const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const idParamSchema = z.object({
  id: integerString('ID harus berupa bilangan bulat positif').pipe(
    z.number().int().min(1, 'ID harus berupa bilangan bulat positif'),
  ),
});

export const upsertFarmerProfileSchema = z.object({
  farmName: z
    .string({ message: 'Nama usaha wajib diisi' })
    .trim()
    .min(2, 'Nama usaha minimal 2 karakter')
    .max(100, 'Nama usaha maksimal 100 karakter'),
  description: z
    .string({ message: 'Deskripsi wajib diisi' })
    .trim()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(1000, 'Deskripsi maksimal 1000 karakter'),
  location: z
    .string({ message: 'Lokasi wajib diisi' })
    .trim()
    .min(2, 'Lokasi minimal 2 karakter')
    .max(150, 'Lokasi maksimal 150 karakter'),
  photoUrl: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z
      .string()
      .trim()
      .max(191, 'URL foto maksimal 191 karakter')
      .url('Format URL foto tidak valid')
      .nullable()
      .optional(),
  ),
});

