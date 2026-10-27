import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { marketplaceController } from './marketplace.controller.js';
import { idParamSchema, listQuerySchema } from './marketplace.validation.js';

const router = Router();

router.get('/', validate(listQuerySchema, 'query'), marketplaceController.listProducts);
router.get('/:id', validate(idParamSchema, 'params'), marketplaceController.getProductDetail);

export default router;

