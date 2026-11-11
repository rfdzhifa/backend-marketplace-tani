import { paymentService } from './payment.service.js';

export const createSnapToken = (buyerId, paymentId) => paymentService.createSnapToken(buyerId, paymentId);
export const handleMidtransWebhook = (payload) => paymentService.handleMidtransWebhook(payload);
export { paymentService };
