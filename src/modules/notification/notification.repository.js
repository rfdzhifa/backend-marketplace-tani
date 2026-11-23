import { prisma } from '../../config/database.js';

export const notificationRepository = {
  async findPaginatedByUser({ userId, skip, take }) {
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: {
          id: true,
          userId: true,
          pesan: true,
          isRead: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  },

  findByIdForUser(id, userId) {
    return prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        userId: true,
        pesan: true,
        isRead: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  markAsRead(id) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: {
        id: true,
        userId: true,
        pesan: true,
        isRead: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  markAllAsReadByUser(userId) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  },
};
