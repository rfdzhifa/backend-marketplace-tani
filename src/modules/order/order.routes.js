import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { orderController } from './order.controller.js';
import { checkoutSchema } from './order.validation.js';

const router = Router();

router.post(
  '/checkout',
  authenticate,
  authorize(ROLES.BUYER),
  validate(checkoutSchema, 'body'),
  orderController.checkout,
);

export default router;
