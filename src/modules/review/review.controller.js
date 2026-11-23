import { sendSuccess } from '../../shared/utils/response.js';
import { reviewService } from './review.service.js';

export const reviewController = {
  async submitReview(req, res, next) {
    try {
      const data = await reviewService.submitReview(req.user.id, req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Ulasan berhasil dikirim',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getProductReviews(req, res, next) {
    try {
      const { reviews, meta } = await reviewService.getProductReviews(
        req.validated.params.id,
        req.validated.query,
      );
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Daftar ulasan produk berhasil diambil',
        data: reviews,
        meta,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getSellerReviews(req, res, next) {
    try {
      const { data, meta } = await reviewService.getSellerReviews(
        req.user.id,
        req.validated.query,
      );
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Daftar ulasan seller berhasil diambil',
        data,
        meta,
      });
    } catch (err) {
      return next(err);
    }
  },
};
