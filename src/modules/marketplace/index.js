import { marketplaceService } from './marketplace.service.js';

export const findActiveById = (id) => marketplaceService.findActiveById(id);
export const listActiveProductsBySeller = (sellerId) => marketplaceService.listActiveProductsBySeller(sellerId);

