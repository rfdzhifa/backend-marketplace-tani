import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { reviewController } from './review.controller.js';
import { reviewListQuerySchema } from './review.validation.js';

const router = Router();

router.use(authenticate, authorize(ROLES.SELLER));

router.get('/', validate(reviewListQuerySchema, 'query'), reviewController.getSellerReviews);

export default router;
