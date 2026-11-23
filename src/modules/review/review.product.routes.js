import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { reviewController } from './review.controller.js';
import { productIdParamSchema, reviewListQuerySchema } from './review.validation.js';

const router = Router();

router.get(
  '/:id/reviews',
  validate(productIdParamSchema, 'params'),
  validate(reviewListQuerySchema, 'query'),
  reviewController.getProductReviews,
);

export default router;
