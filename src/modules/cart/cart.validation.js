import { z } from 'zod';

const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const idParamSchema = z.object({
  id: integerString('ID harus berupa bilangan bulat positif').pipe(
    z.number().int().min(1, 'ID harus berupa bilangan bulat positif'),
  ),
});

export const addItemSchema = z.object({
  productId: z
    .number({ message: 'Product ID wajib berupa angka' })
    .int('Product ID harus berupa bilangan bulat')
    .min(1, 'Product ID minimal 1'),
  quantity: z
    .number({ message: 'Quantity wajib berupa angka' })
    .int('Quantity harus berupa bilangan bulat')
    .min(1, 'Quantity minimal 1'),
});

export const updateItemSchema = z.object({
  quantity: z
    .number({ message: 'Quantity wajib berupa angka' })
    .int('Quantity harus berupa bilangan bulat')
    .min(1, 'Quantity minimal 1'),
});

