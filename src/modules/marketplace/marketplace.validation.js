import { z } from 'zod';

const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const listQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100, 'Kata kunci maksimal 100 karakter')
    .default(''),
  page: integerString('Page harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Page minimal 1'))
    .default(1),
  limit: integerString('Limit harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Limit minimal 1').max(50, 'Limit maksimal 50'))
    .default(12),
});

export const idParamSchema = z.object({
  id: integerString('ID harus berupa bilangan bulat positif').pipe(
    z.number().int().min(1, 'ID harus berupa bilangan bulat positif'),
  ),
});

