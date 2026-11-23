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
};
