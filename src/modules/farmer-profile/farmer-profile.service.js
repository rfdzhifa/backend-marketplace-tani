import { NotFoundError } from '../../shared/errors/AppError.js';
import { listActiveProductsBySeller } from '../marketplace/index.js';
import { farmerProfileRepository } from './farmer-profile.repository.js';

export const farmerProfileService = {
  async getPublicProfile(sellerId) {
    const seller = await farmerProfileRepository.findSellerWithProfile(sellerId);
    if (!seller) {
      throw new NotFoundError('Petani tidak ditemukan');
    }

    const products = await listActiveProductsBySeller(seller.id);

    if (!seller.farmerProfile) {
      return {
        id: seller.id,
        name: seller.nama,
        farmName: null,
        description: null,
        location: null,
        photoUrl: null,
        products,
      };
    }

    return {
      id: seller.id,
      name: seller.nama,
      farmName: seller.farmerProfile.namaUsaha,
      description: seller.farmerProfile.deskripsi,
      location: seller.farmerProfile.lokasi,
      photoUrl: seller.farmerProfile.foto,
      products,
    };
  },

  async getMyProfile(userId) {
    const profile = await farmerProfileRepository.findByUserId(userId);
    return farmerProfileRepository.toProfileData(profile);
  },

  async upsertMyProfile(userId, payload) {
    const saved = await farmerProfileRepository.upsertByUserId(userId, payload);
    return farmerProfileRepository.toProfileData(saved);
  },
};

