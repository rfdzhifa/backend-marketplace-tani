import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { cartController } from './cart.controller.js';
import { addItemSchema, idParamSchema, updateItemSchema } from './cart.validation.js';

const router = Router();

router.use(authenticate, authorize(ROLES.BUYER));

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema, 'body'), cartController.addItem);
router.patch(
  '/items/:id',
  validate(idParamSchema, 'params'),
  validate(updateItemSchema, 'body'),
  cartController.updateItem,
);
router.delete('/items/:id', validate(idParamSchema, 'params'), cartController.removeItem);

export default router;

