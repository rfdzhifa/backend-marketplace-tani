import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { paymentController } from './payment.controller.js';
import { midtransWebhookSchema, paymentIdParamSchema } from './payment.validation.js';

const router = Router();

router.post(
  '/:paymentId/snap-token',
  authenticate,
  authorize(ROLES.BUYER),
  validate(paymentIdParamSchema, 'params'),
  paymentController.createSnapToken,
);

router.post(
  '/midtrans/webhook',
  validate(midtransWebhookSchema, 'body'),
  paymentController.handleWebhook,
);

export default router;
