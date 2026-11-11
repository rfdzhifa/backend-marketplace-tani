import { cartService } from './cart.service.js';

export const getCart = (buyerId) => cartService.getCart(buyerId);
export const toCartResponse = (cart) => cartService.toCartResponse(cart);
export const getCartItemsForCheckout = (buyerId, client) => cartService.getCartItemsForCheckout(buyerId, client);
export const clearCart = (buyerId, client) => cartService.clearCart(buyerId, client);

