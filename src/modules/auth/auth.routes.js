import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { authController } from './auth.controller.js';
import { loginSchema, registerSchema, updateProfileSchema } from './auth.validation.js';

const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan, silakan coba lagi nanti',
    errors: [],
  },
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan pada profil, silakan coba lagi nanti',
    errors: [],
  },
});

const router = Router();

router.post(
  '/register',
  authSensitiveLimiter,
  validate(registerSchema),
  authController.register,
);
router.post(
  '/login',
  authSensitiveLimiter,
  validate(loginSchema),
  authController.login,
);
router.get(
  '/profile',
  profileLimiter,
  authenticate,
  authController.getProfile,
);
router.put(
  '/profile',
  profileLimiter,
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile,
);

export default router;

