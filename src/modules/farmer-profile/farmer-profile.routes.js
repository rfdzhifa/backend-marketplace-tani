import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { farmerProfileController } from './farmer-profile.controller.js';
import { idParamSchema, upsertFarmerProfileSchema } from './farmer-profile.validation.js';

export const farmerProfilePublicRoutes = Router();
farmerProfilePublicRoutes.get(
  '/:id',
  validate(idParamSchema, 'params'),
  farmerProfileController.getFarmerProfile,
);

export const farmerProfileSellerRoutes = Router();
farmerProfileSellerRoutes.use(authenticate, authorize(ROLES.SELLER));
farmerProfileSellerRoutes.get('/', farmerProfileController.getMyFarmerProfile);
farmerProfileSellerRoutes.put(
  '/',
  validate(upsertFarmerProfileSchema),
  farmerProfileController.upsertMyFarmerProfile,
);

