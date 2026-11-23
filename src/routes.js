import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import {
  farmerProfilePublicRoutes,
  farmerProfileSellerRoutes,
} from './modules/farmer-profile/farmer-profile.routes.js';
import marketplaceRoutes from './modules/marketplace/marketplace.routes.js';
import sellerProductRoutes from './modules/marketplace/marketplace.seller.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', marketplaceRoutes);
router.use('/farmers', farmerProfilePublicRoutes);
router.use('/seller/farmer-profile', farmerProfileSellerRoutes);
router.use('/seller/products', sellerProductRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);

export default router;
