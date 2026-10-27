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
};

