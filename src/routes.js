import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import {
  farmerProfilePublicRoutes,
  farmerProfileSellerRoutes,
} from './modules/farmer-profile/farmer-profile.routes.js';
import marketplaceRoutes from './modules/marketplace/marketplace.routes.js';
import sellerProductRoutes from './modules/marketplace/marketplace.seller.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import orderRoutes from './modules/order/order.routes.js';
import sellerOrderRoutes from './modules/order/order.seller.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import reviewProductRoutes from './modules/review/review.product.routes.js';
import reviewRoutes from './modules/review/review.routes.js';
import reviewSellerRoutes from './modules/review/review.seller.routes.js';
import sellerDashboardRoutes from './modules/seller-dashboard/seller-dashboard.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', reviewProductRoutes);
router.use('/products', marketplaceRoutes);
router.use('/farmers', farmerProfilePublicRoutes);
router.use('/seller/farmer-profile', farmerProfileSellerRoutes);
router.use('/seller/products', sellerProductRoutes);
router.use('/seller/reviews', reviewSellerRoutes);
router.use('/seller/dashboard', sellerDashboardRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/seller/orders', sellerOrderRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);

export default router;
