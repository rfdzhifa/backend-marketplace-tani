import { z } from 'zod';

export const paymentIdParamSchema = z.object({
  paymentId: z.coerce.number().int().positive('ID pembayaran harus berupa bilangan bulat positif'),
});

export const midtransWebhookSchema = z
  .object({
    order_id: z.string({ required_error: 'order_id wajib diisi' }),
    status_code: z.string({ required_error: 'status_code wajib diisi' }),
    gross_amount: z.string({ required_error: 'gross_amount wajib diisi' }),
    signature_key: z.string({ required_error: 'signature_key wajib diisi' }),
    transaction_status: z.string({ required_error: 'transaction_status wajib diisi' }),
    fraud_status: z.string().optional(),
    payment_type: z.string().optional(),
  })
  .passthrough();

