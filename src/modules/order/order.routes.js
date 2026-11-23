import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { orderController } from './order.controller.js';
import { checkoutSchema, orderIdParamSchema, orderListQuerySchema } from './order.validation.js';

const router = Router();

router.use(authenticate, authorize(ROLES.BUYER));

router.get('/', validate(orderListQuerySchema, 'query'), orderController.getBuyerOrders);
router.get('/:id', validate(orderIdParamSchema, 'params'), orderController.getBuyerOrderDetail);
router.post('/checkout', validate(checkoutSchema, 'body'), orderController.checkout);

export default router;

