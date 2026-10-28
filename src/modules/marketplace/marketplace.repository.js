import { prisma } from '../../config/database.js';

const sellerSelect = {
  select: {
    id: true,
    nama: true,
    farmerProfile: {
      select: {
        namaUsaha: true,
      },
    },
  },
};

function escapeLikeWildcards(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildWhere(search) {
  const where = { deletedAt: null };
  if (search) {
    where.nama = { contains: escapeLikeWildcards(search) };
  }
  return where;
}

function buildSellerWhere(sellerId, status) {
  const where = { sellerId, deletedAt: null };
  if (status === 'available') {
    where.stok = { gt: 0 };
  } else if (status === 'out_of_stock') {
    where.stok = 0;
  }
  return where;
}

export const marketplaceRepository = {
  findManyActive({ search, skip, take }) {
    return prisma.product.findMany({
      where: buildWhere(search),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      include: { seller: sellerSelect },
    });
  },

  countActive({ search }) {
    return prisma.product.count({ where: buildWhere(search) });
  },

  findActiveById(id) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { seller: sellerSelect },
    });
  },

  findManyActiveBySeller(sellerId) {
    return prisma.product.findMany({
      where: { sellerId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { seller: sellerSelect },
    });
  },

  findManyBySeller({ sellerId, status, skip, take }) {
    return prisma.product.findMany({
      where: buildSellerWhere(sellerId, status),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    });
  },

  countBySeller({ sellerId, status }) {
    return prisma.product.count({
      where: buildSellerWhere(sellerId, status),
    });
  },

  findBySellerAndId(sellerId, id) {
    return prisma.product.findFirst({
      where: { id, sellerId, deletedAt: null },
    });
  },

  createForSeller(sellerId, data) {
    return prisma.product.create({
      data: {
        sellerId,
        nama: data.name,
        deskripsi: data.description ?? null,
        harga: data.price,
        satuan: data.unit,
        stok: data.stock,
        gambarUrl: data.imageUrl ?? null,
      },
    });
  },

  updateById(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.nama = data.name;
    if (data.description !== undefined) updateData.deskripsi = data.description;
    if (data.price !== undefined) updateData.harga = data.price;
    if (data.unit !== undefined) updateData.satuan = data.unit;
    if (data.stock !== undefined) updateData.stok = data.stock;
    if (data.imageUrl !== undefined) updateData.gambarUrl = data.imageUrl;

    return prisma.product.update({
      where: { id },
      data: updateData,
    });
  },

  updateStockById(id, stok) {
    return prisma.product.update({
      where: { id },
      data: { stok },
    });
  },

  softDeleteById(id) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
