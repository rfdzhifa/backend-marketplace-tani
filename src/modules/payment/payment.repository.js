import { prisma } from '../../config/database.js';

export const paymentRepository = {
  findPaymentById(id, client = prisma) {
    return client.payment.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            buyer: {
              select: {
                id: true,
                nama: true,
                email: true,
                noTelepon: true,
              },
            },
            seller: {
              select: {
                id: true,
                nama: true,
                farmerProfile: {
                  select: {
                    namaUsaha: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },

  findPaymentByMidtransOrderId(midtransOrderId, client = prisma) {
    return client.payment.findUnique({
      where: { midtransOrderId },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            buyer: {
              select: {
                id: true,
                nama: true,
                email: true,
                noTelepon: true,
              },
            },
            seller: {
              select: {
                id: true,
                nama: true,
              },
            },
          },
        },
      },
    });
  },

  updatePayment(id, data, client = prisma) {
    return client.payment.update({
      where: { id },
      data,
    });
  },

  updateOrdersStatus(orderIds, status, client = prisma) {
    return client.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status },
    });
  },

  createOrderStatusHistories(entries, client = prisma) {
    return client.orderStatusHistory.createMany({
      data: entries,
    });
  },

  decrementProductStock(productId, quantity, client = prisma) {
    return client.product.update({
      where: { id: productId },
      data: {
        stok: {
          decrement: quantity,
        },
      },
    });
  },

  createNotifications(entries, client = prisma) {
    return client.notification.createMany({
      data: entries,
    });
  },
};
