import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { FLAT_SHIPPING_FEE_PER_SELLER } from '../../shared/constants/order.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { getCartItemsForCheckout } from '../cart/index.js';
import { orderRepository } from './order.repository.js';

function formatOrderItems(items = []) {
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    nama: item.product?.nama || null,
    satuan: item.product?.satuan || null,
    gambarUrl: item.product?.gambarUrl || null,
    jumlah: item.jumlah,
    hargaSatuan: Number(item.hargaSatuan),
    subtotal: Number(item.subtotal),
  }));
}

function formatBuyerOrderSummary(order) {
  const totalHarga = Number(order.totalHarga);
  const ongkir = Number(order.ongkir);
  const itemsSubtotal = totalHarga - ongkir;
  const items = formatOrderItems(order.items);

  return {
    id: order.id,
    nomorOrder: order.nomorOrder,
    tanggalOrder: order.tanggalOrder,
    status: order.status,
    totalHarga,
    ongkir,
    itemsSubtotal,
    itemsCount: items.length,
    namaPenerima: order.namaPenerima,
    catatan: order.catatan,
    seller: {
      id: order.seller.id,
      name: order.seller.farmerProfile?.namaUsaha || order.seller.nama,
      nama: order.seller.nama,
      namaUsaha: order.seller.farmerProfile?.namaUsaha || order.seller.nama,
      lokasi: order.seller.farmerProfile?.lokasi || null,
    },
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          metodePembayaran: order.payment.metodePembayaran,
          paidAt: order.payment.paidAt,
        }
      : null,
    items,
  };
}

function formatBuyerOrderDetail(order) {
  const summary = formatBuyerOrderSummary(order);

  return {
    ...summary,
    seller: {
      ...summary.seller,
      foto: order.seller.farmerProfile?.foto || null,
    },
    payment: order.payment
      ? {
          id: order.payment.id,
          midtransOrderId: order.payment.midtransOrderId,
          status: order.payment.status,
          metodePembayaran: order.payment.metodePembayaran,
          jumlah: Number(order.payment.jumlah),
          paidAt: order.payment.paidAt,
        }
      : null,
    statusHistory: (order.statusHistory || []).map((h) => ({
      id: h.id,
      status: h.status,
      waktuPerubahan: h.waktuPerubahan,
    })),
  };
}

function formatSellerOrderSummary(order) {
  const totalHarga = Number(order.totalHarga);
  const ongkir = Number(order.ongkir);
  const itemsSubtotal = totalHarga - ongkir;
  const items = formatOrderItems(order.items);

  return {
    id: order.id,
    nomorOrder: order.nomorOrder,
    tanggalOrder: order.tanggalOrder,
    status: order.status,
    totalHarga,
    ongkir,
    itemsSubtotal,
    itemsCount: items.length,
    namaPenerima: order.namaPenerima,
    catatan: order.catatan,
    buyer: order.buyer
      ? {
          id: order.buyer.id,
          nama: order.buyer.nama,
          noTelepon: order.buyer.noTelepon,
        }
      : null,
    payment: order.payment
      ? {
          id: order.payment.id,
          status: order.payment.status,
          metodePembayaran: order.payment.metodePembayaran,
          paidAt: order.payment.paidAt,
        }
      : null,
    items,
  };
}

function formatSellerOrderDetail(order) {
  const summary = formatSellerOrderSummary(order);

  return {
    ...summary,
    payment: order.payment
      ? {
          id: order.payment.id,
          midtransOrderId: order.payment.midtransOrderId,
          status: order.payment.status,
          metodePembayaran: order.payment.metodePembayaran,
          jumlah: Number(order.payment.jumlah),
          paidAt: order.payment.paidAt,
        }
      : null,
    statusHistory: (order.statusHistory || []).map((h) => ({
      id: h.id,
      status: h.status,
      waktuPerubahan: h.waktuPerubahan,
    })),
  };
}

async function transitionSellerOrderStatus({
  sellerId,
  orderId,
  expectedStatus,
  nextStatus,
  invalidMessage,
  notificationMessage,
}) {
  return prisma.$transaction(async (tx) => {
    const order = await orderRepository.findOrderById(orderId, tx);
    if (!order || order.sellerId !== sellerId) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    if (order.status !== expectedStatus) {
      throw new BadRequestError(invalidMessage);
    }

    await orderRepository.updateOrderStatus(order.id, nextStatus, tx);
    await orderRepository.createOrderStatusHistory(
      {
        orderId: order.id,
        status: nextStatus,
      },
      tx,
    );
    await orderRepository.createNotification(
      {
        userId: order.buyerId,
        pesan: notificationMessage(order.nomorOrder),
      },
      tx,
    );

    const updatedOrder = await orderRepository.findOrderById(order.id, tx);
    return formatSellerOrderDetail(updatedOrder);
  });
}

export const orderService = {
  async checkout(buyerId, checkoutData) {
    return prisma.$transaction(async (tx) => {
      const cartItems = await getCartItemsForCheckout(buyerId, tx);

      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestError('Keranjang belanja masih kosong');
      }

      for (const item of cartItems) {
        if (item.product.deletedAt !== null) {
          throw new BadRequestError(`Produk "${item.product.nama}" sudah tidak tersedia`);
        }

        if (item.product.stok < item.jumlah) {
          throw new BadRequestError(
            `Stok produk "${item.product.nama}" tidak mencukupi (tersedia: ${item.product.stok}, diminta: ${item.jumlah})`,
          );
        }
      }

      const sellerGroups = new Map();
      for (const item of cartItems) {
        const sellerId = item.product.seller.id;
        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, {
            sellerId,
            seller: item.product.seller,
            items: [],
          });
        }
        sellerGroups.get(sellerId).items.push(item);
      }

      let grandTotal = 0;
      const preparedOrders = [];

      for (const group of sellerGroups.values()) {
        let itemsSubtotal = 0;
        const items = group.items.map((item) => {
          const unitPrice = Number(item.product.harga);
          const itemSubtotal = unitPrice * item.jumlah;
          itemsSubtotal += itemSubtotal;

          return {
            productId: item.productId,
            jumlah: item.jumlah,
            hargaSatuan: unitPrice,
            subtotal: itemSubtotal,
          };
        });

        const ongkir = FLAT_SHIPPING_FEE_PER_SELLER;
        const totalHarga = itemsSubtotal + ongkir;
        grandTotal += totalHarga;

        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const nomorOrder = `ORD-${Date.now()}-${group.sellerId}-${randomSuffix}`;

        preparedOrders.push({
          sellerId: group.sellerId,
          nomorOrder,
          totalHarga,
          ongkir,
          itemsSubtotal,
          items,
        });
      }

      const paymentRandom = crypto.randomBytes(3).toString('hex').toUpperCase();
      const midtransOrderId = `PAY-${Date.now()}-${paymentRandom}`;

      const payment = await orderRepository.createPayment(
        {
          midtransOrderId,
          jumlah: grandTotal,
          status: 'PENDING',
        },
        tx,
      );

      const createdOrders = [];
      for (const prep of preparedOrders) {
        const order = await orderRepository.createOrder(
          {
            buyerId,
            sellerId: prep.sellerId,
            nomorOrder: prep.nomorOrder,
            totalHarga: prep.totalHarga,
            ongkir: prep.ongkir,
            namaPenerima: checkoutData.namaPenerima,
            catatan: checkoutData.catatan || null,
            status: 'MENUNGGU_PEMBAYARAN',
            paymentId: payment.id,
            items: {
              create: prep.items,
            },
            statusHistory: {
              create: {
                status: 'MENUNGGU_PEMBAYARAN',
              },
            },
          },
          tx,
        );
        createdOrders.push(order);
      }

      const formattedOrders = createdOrders.map((order) => {
        const totalHarga = Number(order.totalHarga);
        const ongkir = Number(order.ongkir);
        const itemsSubtotal = totalHarga - ongkir;

        return {
          id: order.id,
          nomorOrder: order.nomorOrder,
          sellerId: order.sellerId,
          seller: {
            id: order.seller.id,
            name: order.seller.farmerProfile?.namaUsaha || order.seller.nama,
            nama: order.seller.nama,
            namaUsaha: order.seller.farmerProfile?.namaUsaha || order.seller.nama,
          },
          status: order.status,
          totalHarga,
          ongkir,
          itemsSubtotal,
          namaPenerima: order.namaPenerima,
          catatan: order.catatan,
          tanggalOrder: order.tanggalOrder,
          paymentId: order.paymentId,
          items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            nama: item.product.nama,
            satuan: item.product.satuan,
            gambarUrl: item.product.gambarUrl,
            jumlah: item.jumlah,
            hargaSatuan: Number(item.hargaSatuan),
            subtotal: Number(item.subtotal),
          })),
          statusHistory: (order.statusHistory || []).map((h) => ({
            id: h.id,
            status: h.status,
            waktuPerubahan: h.waktuPerubahan,
          })),
        };
      });

      return {
        paymentId: payment.id,
        grandTotal,
        orders: formattedOrders,
        summary: {
          totalOrders: formattedOrders.length,
          totalOngkir: formattedOrders.reduce((sum, o) => sum + o.ongkir, 0),
          itemsSubtotal: formattedOrders.reduce((sum, o) => sum + o.itemsSubtotal, 0),
          grandTotal,
        },
      };
    });
  },

  async getBuyerOrders(buyerId, { page, limit, status }) {
    const { orders, total } = await orderRepository.findOrdersByBuyer({
      buyerId,
      status,
      page,
      limit,
    });

    return {
      orders: orders.map(formatBuyerOrderSummary),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getBuyerOrderDetail(buyerId, orderId) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order || order.buyerId !== buyerId) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    return formatBuyerOrderDetail(order);
  },

  async getSellerOrders(sellerId, { page, limit, status }) {
    const { orders, total } = await orderRepository.findOrdersBySeller({
      sellerId,
      status,
      page,
      limit,
    });

    return {
      orders: orders.map(formatSellerOrderSummary),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getSellerOrderDetail(sellerId, orderId) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order || order.sellerId !== sellerId) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    return formatSellerOrderDetail(order);
  },

  async processSellerOrder(sellerId, orderId) {
    return transitionSellerOrderStatus({
      sellerId,
      orderId,
      expectedStatus: 'DIBAYAR',
      nextStatus: 'DIPROSES',
      invalidMessage: 'Pesanan hanya dapat diproses jika berstatus Dibayar',
      notificationMessage: (nomorOrder) =>
        `Pesanan #${nomorOrder} sedang diproses oleh penjual.`,
    });
  },

  async shipSellerOrder(sellerId, orderId) {
    return transitionSellerOrderStatus({
      sellerId,
      orderId,
      expectedStatus: 'DIPROSES',
      nextStatus: 'DIKIRIM',
      invalidMessage: 'Pesanan hanya dapat dikirim jika berstatus Diproses',
      notificationMessage: (nomorOrder) =>
        `Pesanan #${nomorOrder} telah dikirim oleh penjual.`,
    });
  },
};
