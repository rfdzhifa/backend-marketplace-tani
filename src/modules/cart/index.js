import { cartService } from './cart.service.js';

export const getCart = (buyerId) => cartService.getCart(buyerId);
export const toCartResponse = (cart) => cartService.toCartResponse(cart);

