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
};
