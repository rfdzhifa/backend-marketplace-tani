import { z } from 'zod';

const integerString = (message) => z.string().regex(/^\d+$/, message).transform(Number);

export const notificationListQuerySchema = z.object({
  page: integerString('Page harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Page minimal 1'))
    .default(1),
  limit: integerString('Limit harus berupa bilangan bulat')
    .pipe(z.number().int().min(1, 'Limit minimal 1').max(50, 'Limit maksimal 50'))
    .default(10),
});

export const notificationIdParamSchema = z.object({
  id: integerString('ID notifikasi harus berupa bilangan bulat positif').pipe(
    z.number().int().min(1, 'ID notifikasi harus berupa bilangan bulat positif'),
  ),
});
