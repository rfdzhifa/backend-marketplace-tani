import { sendSuccess } from '../../shared/utils/response.js';
import { authService } from './auth.service.js';

export const authController = {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      return sendSuccess(res, {
        statusCode: 201,
        message: 'Registrasi berhasil',
        data: user,
      });
    } catch (err) {
      return next(err);
    }
  },

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Login berhasil',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Berhasil',
        data: user,
      });
    } catch (err) {
      return next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Profil berhasil diperbarui',
        data: user,
      });
    } catch (err) {
      return next(err);
    }
  },
};

