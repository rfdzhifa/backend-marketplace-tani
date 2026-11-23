import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { notificationController } from './notification.controller.js';
import { notificationIdParamSchema, notificationListQuerySchema } from './notification.validation.js';

const router = Router();

router.use(authenticate, authorize(ROLES.BUYER, ROLES.SELLER));

router.get('/', validate(notificationListQuerySchema, 'query'), notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', validate(notificationIdParamSchema, 'params'), notificationController.markAsRead);

export default router;
