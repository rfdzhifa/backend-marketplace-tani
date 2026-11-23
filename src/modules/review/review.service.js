import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { reviewRepository } from './review.repository.js';

export const reviewService = {
  async submitReview(buyerId, { orderItemId, rating, komentar }) {
    const orderItem = await reviewRepository.findOrderItemWithContext(orderItemId);

    if (!orderItem || orderItem.order.buyerId !== buyerId) {
      throw new NotFoundError('Item pesanan tidak ditemukan');
    }

    if (orderItem.order.status !== 'SELESAI') {
      throw new BadRequestError('Ulasan hanya dapat diberikan untuk pesanan yang sudah selesai');
    }

    if (orderItem.reviews.length > 0) {
      throw new ConflictError('Produk pada pesanan ini sudah pernah diulas');
    }

    const { review, ratingRataRata, jumlahUlasan } =
      await reviewRepository.createReviewAndRecalculateProduct({
        buyerId,
        orderItemId,
        productId: orderItem.productId,
        rating,
        komentar,
      });

    return {
      id: review.id,
      orderItemId: review.orderItemId,
      productId: review.productId,
      buyerId: review.buyerId,
      rating: review.rating,
      komentar: review.komentar,
      tanggal: review.tanggal,
      buyer: {
        id: review.buyer.id,
        nama: review.buyer.nama,
      },
      product: {
        id: review.product.id,
        nama: review.product.nama,
        ratingRataRata,
        jumlahUlasan,
      },
    };
  },

  async getProductReviews(productId, { page, limit }) {
    const product = await reviewRepository.findActiveProductById(productId);
    if (!product) {
      throw new NotFoundError('Produk tidak ditemukan');
    }

    const skip = (page - 1) * limit;
    const { reviews, total } = await reviewRepository.findProductReviews({
      productId,
      skip,
      take: limit,
    });

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        komentar: review.komentar,
        tanggal: review.tanggal,
        buyer: {
          id: review.buyer.id,
          nama: review.buyer.nama,
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },

  async getSellerReviews(sellerId, { page, limit }) {
    const skip = (page - 1) * limit;
    const { reviews, averageRating, totalReviews } = await reviewRepository.findSellerReviews({
      sellerId,
      skip,
      take: limit,
    });

    return {
      data: {
        summary: {
          averageRating,
          totalReviews,
        },
        reviews: reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          komentar: review.komentar,
          tanggal: review.tanggal,
          product: {
            id: review.product.id,
            nama: review.product.nama,
            gambarUrl: review.product.gambarUrl,
          },
          buyer: {
            id: review.buyer.id,
            nama: review.buyer.nama,
          },
        })),
      },
      meta: {
        page,
        limit,
        total: totalReviews,
        totalPages: totalReviews === 0 ? 0 : Math.ceil(totalReviews / limit),
      },
    };
  },

  getSellerRatingSummary(sellerId) {
    return reviewRepository.getSellerRatingAggregate(sellerId);
  },
};
