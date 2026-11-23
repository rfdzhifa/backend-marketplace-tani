import { orderService } from './order.service.js';

export const checkout = (buyerId, data) => orderService.checkout(buyerId, data);
export const getSellerOrderMetrics = (sellerId) => orderService.getSellerOrderMetrics(sellerId);
export { orderService };

