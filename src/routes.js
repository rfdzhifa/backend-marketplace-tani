import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import marketplaceRoutes from './modules/marketplace/marketplace.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', marketplaceRoutes);

export default router;
