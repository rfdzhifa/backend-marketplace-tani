import { farmerProfileService } from './farmer-profile.service.js';

export const getFarmerPublicProfile = (sellerId) => farmerProfileService.getPublicProfile(sellerId);
export const getFarmerProfileByUserId = (userId) => farmerProfileService.getMyProfile(userId);

