import { NotFoundError } from '../../shared/errors/AppError.js';
import { notificationRepository } from './notification.repository.js';

export const notificationService = {
  async listNotifications(userId, { page, limit }) {
    const skip = (page - 1) * limit;
    const { notifications, total, unreadCount } = await notificationRepository.findPaginatedByUser({
      userId,
      skip,
      take: limit,
    });

    return {
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        unreadCount,
      },
    };
  },

  async markNotificationAsRead(userId, notificationId) {
    const existing = await notificationRepository.findByIdForUser(notificationId, userId);
    if (!existing) {
      throw new NotFoundError('Notifikasi tidak ditemukan');
    }

    if (existing.isRead) {
      return existing;
    }

    return notificationRepository.markAsRead(notificationId);
  },

  async markAllNotificationsAsRead(userId) {
    const result = await notificationRepository.markAllAsReadByUser(userId);
    return { updatedCount: result.count };
  },
};
