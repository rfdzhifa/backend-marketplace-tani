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

  async findActiveProductById(productId) {
    return prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
        nama: true,
      },
    });
  },

  async findProductReviews({ productId, skip, take }) {
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          rating: true,
          komentar: true,
          tanggal: true,
          buyer: {
            select: {
              id: true,
              nama: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    return { reviews, total };
  },

  async findSellerReviews({ sellerId, skip, take }) {
    const where = {
      product: {
        sellerId,
      },
    };

    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          rating: true,
          komentar: true,
          tanggal: true,
          product: {
            select: {
              id: true,
              nama: true,
              gambarUrl: true,
            },
          },
          buyer: {
            select: {
              id: true,
              nama: true,
            },
          },
        },
      }),
      prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    return {
      reviews,
      averageRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
      totalReviews: aggregate._count.id,
    };
  },

  async getSellerRatingAggregate(sellerId) {
    const aggregate = await prisma.review.aggregate({
      where: {
        product: {
          sellerId,
        },
      },
      _avg: { rating: true },
    });

    return Number((aggregate._avg.rating ?? 0).toFixed(2));
  },
};
