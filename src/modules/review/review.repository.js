import { prisma } from '../../config/database.js';

export const reviewRepository = {
  async findOrderItemWithContext(orderItemId) {
    return prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        orderId: true,
        productId: true,
        order: {
          select: {
            id: true,
            buyerId: true,
            status: true,
          },
        },
        product: {
          select: {
            id: true,
            nama: true,
          },
        },
        reviews: {
          select: { id: true },
          take: 1,
        },
      },
    });
  },

  async createReviewAndRecalculateProduct({ buyerId, orderItemId, productId, rating, komentar }) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          buyerId,
          orderItemId,
          productId,
          rating,
          komentar,
        },
        include: {
          buyer: {
            select: { id: true, nama: true },
          },
          product: {
            select: { id: true, nama: true },
          },
        },
      });

      const aggregate = await tx.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { id: true },
      });

      const ratingRataRata = Number((aggregate._avg.rating ?? 0).toFixed(2));
      const jumlahUlasan = aggregate._count.id;

      await tx.product.update({
        where: { id: productId },
        data: {
          ratingRataRata,
          jumlahUlasan,
        },
      });

      return {
        review,
        ratingRataRata,
        jumlahUlasan,
      };
    });
  },
};
