import { sendSuccess } from '../../shared/utils/response.js';
import { notificationService } from './notification.service.js';

export const notificationController = {
  async listNotifications(req, res, next) {
    try {
      const { notifications, meta } = await notificationService.listNotifications(
        req.user.id,
        req.validated.query,
      );

      return sendSuccess(res, {
        statusCode: 200,
        message: 'Daftar notifikasi berhasil diambil',
        data: notifications,
        meta,
      });
    } catch (err) {
      return next(err);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      const data = await notificationService.markAllNotificationsAsRead(req.user.id);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Semua notifikasi berhasil ditandai telah dibaca',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const data = await notificationService.markNotificationAsRead(
        req.user.id,
        req.validated.params.id,
      );

      return sendSuccess(res, {
        statusCode: 200,
        message: 'Notifikasi berhasil ditandai telah dibaca',
        data,
      });
    } catch (err) {
      return next(err);
    }
  },
};
