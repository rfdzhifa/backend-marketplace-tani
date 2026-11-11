import { orderService } from './order.service.js';

export const checkout = (buyerId, data) => orderService.checkout(buyerId, data);
export { orderService };
