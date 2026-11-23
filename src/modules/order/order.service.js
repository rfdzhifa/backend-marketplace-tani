import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { FLAT_SHIPPING_FEE_PER_SELLER } from '../../shared/constants/order.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import { getCartItemsForCheckout } from '../cart/index.js';
import { orderRepository } from './order.repository.js';

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
};
