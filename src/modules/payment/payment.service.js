import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { snap } from '../../config/midtrans.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import { clearCart } from '../cart/index.js';
import { paymentRepository } from './payment.repository.js';

export const paymentService = {
  async createSnapToken(buyerId, paymentId) {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment || !payment.orders || payment.orders.length === 0) {
      throw new NotFoundError('Data pembayaran tidak ditemukan');
    }

    const isOwner = payment.orders.every((order) => order.buyerId === buyerId);
    if (!isOwner) {
      throw new NotFoundError('Data pembayaran tidak ditemukan');
    }

    if (payment.status === 'PAID') {
      throw new BadRequestError('Pembayaran sudah lunas');
    }

    if (payment.snapToken && payment.snapRedirectUrl) {
      return {
        paymentId: payment.id,
        midtransOrderId: payment.midtransOrderId,
        snapToken: payment.snapToken,
        redirectUrl: payment.snapRedirectUrl,
      };
    }

    const buyer = payment.orders[0].buyer;
    const grossAmount = Math.round(Number(payment.jumlah));

    const itemDetails = [];
    for (const order of payment.orders) {
      for (const item of order.items) {
        itemDetails.push({
          id: `PROD-${item.productId}`,
          price: Math.round(Number(item.hargaSatuan)),
          quantity: item.jumlah,
          name: item.product.nama.substring(0, 50),
        });
      }
      if (Number(order.ongkir) > 0) {
        itemDetails.push({
          id: `ONGKIR-${order.id}`,
          price: Math.round(Number(order.ongkir)),
          quantity: 1,
          name: `Ongkir ${order.nomorOrder}`.substring(0, 50),
        });
      }
    }

    const nameParts = (buyer.nama || '').trim().split(' ');
    const firstName = nameParts[0] || 'Pembeli';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    const customerDetails = {
      first_name: firstName,
      last_name: lastName,
      email: buyer.email,
      phone: buyer.noTelepon || undefined,
    };

    const parameter = {
      transaction_details: {
        order_id: payment.midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: customerDetails,
      item_details: itemDetails,
    };

    const transaction = await snap.createTransaction(parameter);
    const snapToken = transaction.token;
    const snapRedirectUrl = transaction.redirect_url;

    await paymentRepository.updatePayment(payment.id, {
      snapToken,
      snapRedirectUrl,
    });

    return {
      paymentId: payment.id,
      midtransOrderId: payment.midtransOrderId,
      snapToken,
      redirectUrl: snapRedirectUrl,
    };
  },

  async handleMidtransWebhook(payload) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      payment_type,
    } = payload;

    const serverKey = env.MIDTRANS_SERVER_KEY;
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (expectedSignature !== signature_key) {
      throw new ForbiddenError('Signature webhook tidak valid');
    }

    const payment = await paymentRepository.findPaymentByMidtransOrderId(order_id);
    if (!payment) {
      throw new NotFoundError('Data pembayaran tidak ditemukan');
    }

    if (payment.status === 'PAID') {
      return {
        success: true,
        message: 'Pembayaran sudah diproses sebelumnya',
        paymentId: payment.id,
        status: payment.status,
      };
    }

    return prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
      });

      if (!currentPayment || currentPayment.status === 'PAID') {
        return {
          success: true,
          message: 'Pembayaran sudah diproses sebelumnya',
          paymentId: payment.id,
          status: currentPayment?.status || 'PAID',
        };
      }

      if (
        transaction_status === 'settlement' ||
        (transaction_status === 'capture' && fraud_status === 'accept')
      ) {
        await paymentRepository.updatePayment(
          payment.id,
          {
            status: 'PAID',
            paidAt: new Date(),
            metodePembayaran: payment_type || null,
          },
          tx,
        );

        const orderIds = payment.orders.map((o) => o.id);
        await paymentRepository.updateOrdersStatus(orderIds, 'DIBAYAR', tx);

        const historyEntries = orderIds.map((orderId) => ({
          orderId,
          status: 'DIBAYAR',
        }));
        await paymentRepository.createOrderStatusHistories(historyEntries, tx);

        for (const order of payment.orders) {
          for (const item of order.items) {
            await paymentRepository.decrementProductStock(item.productId, item.jumlah, tx);
          }
        }

        const buyerId = payment.orders[0]?.buyerId;
        if (buyerId) {
          await clearCart(buyerId, tx);
        }

        const notificationEntries = payment.orders.map((order) => ({
          userId: order.sellerId,
          pesan: `Pesanan baru #${order.nomorOrder} telah dibayar dan siap diproses.`,
        }));
        await paymentRepository.createNotifications(notificationEntries, tx);

        return {
          success: true,
          message: 'Pembayaran berhasil dikonfirmasi',
          paymentId: payment.id,
          status: 'PAID',
        };
      }

      if (['expire', 'cancel', 'deny'].includes(transaction_status)) {
        const newStatus = transaction_status === 'expire' ? 'EXPIRED' : 'FAILED';

        await paymentRepository.updatePayment(
          payment.id,
          {
            status: newStatus,
          },
          tx,
        );

        const orderIds = payment.orders.map((o) => o.id);
        await paymentRepository.updateOrdersStatus(orderIds, 'DIBATALKAN', tx);

        const historyEntries = orderIds.map((orderId) => ({
          orderId,
          status: 'DIBATALKAN',
        }));
        await paymentRepository.createOrderStatusHistories(historyEntries, tx);

        return {
          success: true,
          message: `Status pembayaran diperbarui menjadi ${newStatus}`,
          paymentId: payment.id,
          status: newStatus,
        };
      }

      return {
        success: true,
        message: 'Status pembayaran diterima',
        paymentId: payment.id,
        status: currentPayment.status,
      };
    });
  },
};
