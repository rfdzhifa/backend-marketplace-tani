import { z } from 'zod';

const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const sellerProductQuerySchema = z.object({
  status: z
    .enum(['all', 'available', 'out_of_stock'], {
      message: 'Status harus berupa all, available, atau out_of_stock',
    })
    .default('all'),
  page: integerString('Page harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Page minimal 1'))
    .default(1),
  limit: integerString('Limit harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Limit minimal 1').max(50, 'Limit maksimal 50'))
    .default(12),
});

export const createSellerProductSchema = z.object({
  name: z
    .string({ message: 'Nama produk wajib diisi' })
    .trim()
    .min(2, 'Nama produk minimal 2 karakter')
    .max(150, 'Nama produk maksimal 150 karakter'),
  description: z
    .string()
    .trim()
    .max(5000, 'Deskripsi produk maksimal 5000 karakter')
    .nullable()
    .optional(),
  price: z
    .number({ message: 'Harga wajib berupa angka' })
    .int('Harga harus berupa bilangan bulat')
    .min(1, 'Harga minimal Rp 1')
    .max(9999999999, 'Harga maksimal Rp 9.999.999.999'),
  unit: z
    .string({ message: 'Satuan wajib diisi' })
    .trim()
    .min(1, 'Satuan minimal 1 karakter')
    .max(30, 'Satuan maksimal 30 karakter')
    .default('kg'),
  stock: z
    .number({ message: 'Stok wajib berupa angka' })
    .int('Stok harus berupa bilangan bulat')
    .min(0, 'Stok minimal 0')
    .max(2147483647, 'Stok melebihi batas maksimal'),
  imageUrl: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z
      .string()
      .trim()
      .max(255, 'URL gambar maksimal 255 karakter')
      .url('Format URL gambar tidak valid')
      .nullable()
      .optional(),
  ),
});

export const updateSellerProductSchema = z.object({
  name: z
    .string({ message: 'Nama produk wajib diisi' })
    .trim()
    .min(2, 'Nama produk minimal 2 karakter')
    .max(150, 'Nama produk maksimal 150 karakter'),
  description: z
    .string()
    .trim()
    .max(5000, 'Deskripsi produk maksimal 5000 karakter')
    .nullable()
    .optional(),
  price: z
    .number({ message: 'Harga wajib berupa angka' })
    .int('Harga harus berupa bilangan bulat')
    .min(1, 'Harga minimal Rp 1')
    .max(9999999999, 'Harga maksimal Rp 9.999.999.999'),
  unit: z
    .string({ message: 'Satuan wajib diisi' })
    .trim()
    .min(1, 'Satuan minimal 1 karakter')
    .max(30, 'Satuan maksimal 30 karakter')
    .default('kg'),
  stock: z
    .number({ message: 'Stok wajib berupa angka' })
    .int('Stok harus berupa bilangan bulat')
    .min(0, 'Stok minimal 0')
    .max(2147483647, 'Stok melebihi batas maksimal'),
  imageUrl: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z
      .string()
      .trim()
      .max(255, 'URL gambar maksimal 255 karakter')
      .url('Format URL gambar tidak valid')
      .nullable()
      .optional(),
  ),
});

export const updateStockSchema = z.object({
  stock: z
    .number({ message: 'Stok wajib berupa angka' })
    .int('Stok harus berupa bilangan bulat')
    .min(0, 'Stok minimal 0')
    .max(2147483647, 'Stok melebihi batas maksimal'),
});

