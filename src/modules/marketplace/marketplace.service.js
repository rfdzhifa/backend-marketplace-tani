import { NotFoundError } from '../../shared/errors/AppError.js';
import { marketplaceRepository } from './marketplace.repository.js';

function resolveSellerDisplayName(seller) {
  return seller.nama;
}

function toListItem(product) {
  return {
    id: product.id,
    name: product.nama,
    price: Number(product.harga),
    unit: product.satuan,
    stock: product.stok,
    isAvailable: product.stok > 0,
    imageUrl: product.gambarUrl,
    avgRating: Number(product.ratingRataRata),
    reviewCount: product.jumlahUlasan,
    seller: {
      id: product.seller.id,
      name: resolveSellerDisplayName(product.seller),
    },
  };
}

export const marketplaceService = {
  async listProducts({ search, page, limit }) {
    const [products, total] = await Promise.all([
      marketplaceRepository.findManyActive({ search, skip: (page - 1) * limit, take: limit }),
      marketplaceRepository.countActive({ search }),
    ]);

    return {
      items: products.map(toListItem),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getProductDetail(id) {
    const product = await marketplaceRepository.findActiveById(id);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    return {
      ...toListItem(product),
      description: product.deskripsi,
      reviews: [],
    };
  },

  findActiveById(id) {
    return marketplaceRepository.findActiveById(id);
  },
};

