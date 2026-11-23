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
                lokasi: true,
                foto: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            nama: true,
            noTelepon: true,
          },
        },
        payment: {
          select: {
            id: true,
            midtransOrderId: true,
            status: true,
            metodePembayaran: true,
            jumlah: true,
            paidAt: true,
          },
        },
        statusHistory: {
          orderBy: [{ waktuPerubahan: 'asc' }, { id: 'asc' }],
        },
      },
    });
  },

  async findOrdersByBuyer({ buyerId, status, page, limit }, client = prisma) {
    const where = {
      buyerId,
      ...(status ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      client.order.findMany({
        where,
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
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
                  lokasi: true,
                },
              },
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              metodePembayaran: true,
              paidAt: true,
            },
          },
        },
      }),
      client.order.count({ where }),
    ]);

    return { orders, total };
  },

  async findOrdersBySeller({ sellerId, status, page, limit }, client = prisma) {
    const where = {
      sellerId,
      ...(status ? { status } : {}),
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      client.order.findMany({
        where,
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
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
          buyer: {
            select: {
              id: true,
              nama: true,
              noTelepon: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              metodePembayaran: true,
              paidAt: true,
            },
          },
        },
      }),
      client.order.count({ where }),
    ]);

    return { orders, total };
  },

  updateOrderStatus(id, status, client = prisma) {
    return client.order.update({
      where: { id },
      data: { status },
    });
  },

  createOrderStatusHistory(data, client = prisma) {
    return client.orderStatusHistory.create({
      data,
    });
  },

  createNotification(data, client = prisma) {
    return client.notification.create({
      data,
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

