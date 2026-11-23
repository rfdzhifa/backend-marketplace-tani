import { prisma } from '../../config/database.js';

export const orderRepository = {
  createPayment(data, client = prisma) {
    return client.payment.create({
      data,
    });
  },

  createOrder(data, client = prisma) {
    return client.order.create({
      data,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                nama: true,
                satuan: true,
                gambarUrl: true,
              },
            },
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
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  findOrderById(id, client = prisma) {
    return client.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        seller: {
          select: {
            id: true,
            nama: true,
            farmerProfile: true,
          },
        },
        buyer: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  findPaymentById(id, client = prisma) {
    return client.payment.findUnique({
      where: { id },
      include: {
        orders: true,
      },
    });
  },
};

