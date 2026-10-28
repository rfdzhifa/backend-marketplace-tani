import { NotFoundError } from '../../shared/errors/AppError.js';
import { marketplaceRepository } from './marketplace.repository.js';

function resolveSellerDisplayName(seller) {
  return seller.farmerProfile?.namaUsaha || seller.nama;
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

function toSellerListItem(product) {
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
  };
}

function toSellerDetail(product) {
  return {
    ...toSellerListItem(product),
    description: product.deskripsi,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
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

  async listActiveProductsBySeller(sellerId) {
    const products = await marketplaceRepository.findManyActiveBySeller(sellerId);
    return products.map(toListItem);
  },

  async listSellerProducts(sellerId, { status, page, limit }) {
    const [products, total] = await Promise.all([
      marketplaceRepository.findManyBySeller({
        sellerId,
        status,
        skip: (page - 1) * limit,
        take: limit,
      }),
      marketplaceRepository.countBySeller({ sellerId, status }),
    ]);

    return {
      items: products.map(toSellerListItem),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getSellerProduct(sellerId, id) {
    const product = await marketplaceRepository.findBySellerAndId(sellerId, id);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    return toSellerDetail(product);
  },

  async createSellerProduct(sellerId, payload) {
    const created = await marketplaceRepository.createForSeller(sellerId, {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      unit: payload.unit,
      stock: payload.stock,
      imageUrl: payload.imageUrl,
    });

    return toSellerDetail(created);
  },

  async updateSellerProduct(sellerId, id, payload) {
    const existing = await marketplaceRepository.findBySellerAndId(sellerId, id);
    if (!existing) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    const updated = await marketplaceRepository.updateById(id, {
      name: payload.name,
      description: payload.description,
      price: payload.price,
      unit: payload.unit,
      stock: payload.stock,
      imageUrl: payload.imageUrl,
    });

    return toSellerDetail(updated);
  },

  async updateSellerProductStock(sellerId, id, stock) {
    const existing = await marketplaceRepository.findBySellerAndId(sellerId, id);
    if (!existing) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    const updated = await marketplaceRepository.updateStockById(id, stock);
    return toSellerDetail(updated);
  },

  async deleteSellerProduct(sellerId, id) {
    const existing = await marketplaceRepository.findBySellerAndId(sellerId, id);
    if (!existing) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    await marketplaceRepository.softDeleteById(id);
    return { id };
  },
};
