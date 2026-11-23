import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { orderController } from './order.controller.js';
import { orderIdParamSchema, orderListQuerySchema } from './order.validation.js';

const router = Router();

router.use(authenticate, authorize(ROLES.SELLER));

router.get('/', validate(orderListQuerySchema, 'query'), orderController.getSellerOrders);
router.get('/:id', validate(orderIdParamSchema, 'params'), orderController.getSellerOrderDetail);
router.patch('/:id/process', validate(orderIdParamSchema, 'params'), orderController.processSellerOrder);
router.patch('/:id/ship', validate(orderIdParamSchema, 'params'), orderController.shipSellerOrder);

export default router;
