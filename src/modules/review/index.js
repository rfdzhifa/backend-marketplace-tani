import { reviewService } from './review.service.js';

export const getSellerRatingSummary = (sellerId) => reviewService.getSellerRatingSummary(sellerId);
export { reviewService };
