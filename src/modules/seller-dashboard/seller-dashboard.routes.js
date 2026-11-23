import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../shared/constants/roles.js';
import { sellerDashboardController } from './seller-dashboard.controller.js';

const router = Router();

router.use(authenticate, authorize(ROLES.SELLER));

router.get('/overview', sellerDashboardController.getOverview);

export default router;
