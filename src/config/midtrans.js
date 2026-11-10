import midtransclient from 'midtrans-client';
import { env } from './env.js';

export const snap = new midtransclient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});
