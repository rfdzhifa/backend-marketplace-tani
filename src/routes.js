import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import {
  farmerProfilePublicRoutes,
  farmerProfileSellerRoutes,
} from './modules/farmer-profile/farmer-profile.routes.js';
import marketplaceRoutes from './modules/marketplace/marketplace.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', marketplaceRoutes);
router.use('/farmers', farmerProfilePublicRoutes);
router.use('/seller/farmer-profile', farmerProfileSellerRoutes);

export default router;
