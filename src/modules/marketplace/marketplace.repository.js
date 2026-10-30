import { prisma } from '../../config/database.js';

const sellerSelect = { select: { id: true, nama: true } };

function escapeLikeWildcards(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildWhere(search) {
  const where = { deletedAt: null };
  if (search) {
    const term = escapeLikeWildcards(search);
    where.OR = [
      { nama: { contains: term } },
      { deskripsi: { contains: term } },
    ];
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
};

