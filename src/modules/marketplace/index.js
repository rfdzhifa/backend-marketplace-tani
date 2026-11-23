import { marketplaceService } from './marketplace.service.js';

export const findActiveById = (id) => marketplaceService.findActiveById(id);
export const listActiveProductsBySeller = (sellerId) => marketplaceService.listActiveProductsBySeller(sellerId);
export const countActiveProductsBySeller = (sellerId) => marketplaceService.countActiveProductsBySeller(sellerId);
export { marketplaceService };

