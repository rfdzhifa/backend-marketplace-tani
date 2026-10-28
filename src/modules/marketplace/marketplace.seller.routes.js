import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { marketplaceController } from './marketplace.controller.js';
import {
  createSellerProductSchema,
  sellerProductQuerySchema,
  updateSellerProductSchema,
  updateStockSchema,
} from './marketplace.seller.validation.js';
import { idParamSchema } from './marketplace.validation.js';

const router = Router();

router.use(authenticate, authorize(ROLES.SELLER));

router.get(
  '/',
  validate(sellerProductQuerySchema, 'query'),
  marketplaceController.listSellerProducts,
);
router.get('/:id', validate(idParamSchema, 'params'), marketplaceController.getSellerProduct);
router.post(
  '/',
  validate(createSellerProductSchema, 'body'),
  marketplaceController.createSellerProduct,
);
router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateSellerProductSchema, 'body'),
  marketplaceController.updateSellerProduct,
);
router.patch(
  '/:id/stock',
  validate(idParamSchema, 'params'),
  validate(updateStockSchema, 'body'),
  marketplaceController.updateSellerProductStock,
);
router.delete('/:id', validate(idParamSchema, 'params'), marketplaceController.deleteSellerProduct);

export default router;

