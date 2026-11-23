import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { snap } from '../src/config/midtrans.js';

const testRunId = Date.now();
const seller1Email = `seller1.pay.${testRunId}@mail.com`;
const seller2Email = `seller2.pay.${testRunId}@mail.com`;
const buyer1Email = `buyer1.pay.${testRunId}@mail.com`;
const buyer2Email = `buyer2.pay.${testRunId}@mail.com`;

let seller1;
let seller2;
let buyer1;
let buyer2;

let seller1Token;
let buyer1Token;

let product1;
let product2;

function generateSignature(orderId, statusCode, grossAmount, serverKey = env.MIDTRANS_SERVER_KEY) {
  return crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

describe('Module: Payment Execution & Midtrans Webhook (UC-11)', () => {
  beforeAll(async () => {
    // Mock snap.createTransaction to run tests reliably offline
    vi.spyOn(snap, 'createTransaction').mockImplementation(async (params) => ({
      token: `mock-snap-token-${params.transaction_details.order_id}`,
      redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-${params.transaction_details.order_id}`,
    }));

    seller1 = await prisma.user.create({
      data: {
        nama: 'Petani Makmur Pay',
        email: seller1Email,
        noTelepon: '081233330001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Tani Makmur',
            deskripsi: 'Petani cabai dan tomat segar',
            lokasi: 'Bandung Barat',
          },
        },
      },
    });

    seller2 = await prisma.user.create({
      data: {
        nama: 'Petani Berkah Pay',
        email: seller2Email,
        noTelepon: '081233330002',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Buah Berkah',
            deskripsi: 'Petani buah lokal',
            lokasi: 'Lembang',
          },
        },
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Budi Pembeli Pay',
        email: buyer1Email,
        noTelepon: '081233330003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyer2 = await prisma.user.create({
      data: {
        nama: 'Siti Pembeli Lain',
        email: buyer2Email,
        noTelepon: '081233330004',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    seller1Token = jwt.sign({ sub: seller1.id, role: 'SELLER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyer1Token = jwt.sign({ sub: buyer1.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });

    product1 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Cabai Rawit Pay ${testRunId}`,
        harga: 40000,
        stok: 100,
        satuan: 'kg',
        deskripsi: 'Cabai rawit merah pedas',
      },
    });

    product2 = await prisma.product.create({
      data: {
        sellerId: seller2.id,
        nama: `Jeruk Manis Pay ${testRunId}`,
        harga: 25000,
        stok: 80,
        satuan: 'kg',
        deskripsi: 'Jeruk manis segar Lembang',
      },
    });
  });

  afterAll(async () => {
    const userIds = [seller1?.id, seller2?.id, buyer1?.id, buyer2?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { order: { buyerId: { in: userIds } } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { buyerId: { in: userIds } } },
      });
      await prisma.order.deleteMany({
        where: { buyerId: { in: userIds } },
      });
      await prisma.payment.deleteMany({
        where: { orders: { none: {} } },
      });
      await prisma.cartItem.deleteMany({
        where: { cart: { buyerId: { in: userIds } } },
      });
      await prisma.cart.deleteMany({
        where: { buyerId: { in: userIds } },
      });
      await prisma.product.deleteMany({
        where: { sellerId: { in: userIds } },
      });
      await prisma.farmerProfile.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    vi.restoreAllMocks();
    await prisma.$disconnect();
  });

  // Helper to create order and payment fixtures for testing
  async function createTestPaymentFixture({
    buyer,
    items = [{ product: product1, qty: 2, sellerId: seller1.id }],
    paymentStatus = 'PENDING',
  }) {
    let grandTotal = 0;
    const sellerGroups = new Map();

    for (const it of items) {
      if (!sellerGroups.has(it.sellerId)) {
        sellerGroups.set(it.sellerId, []);
      }
      sellerGroups.get(it.sellerId).push(it);
    }

    const midtransOrderId = `TEST-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return prisma.$transaction(async (tx) => {
      // Calculate total
      for (const [, groupItems] of sellerGroups.entries()) {
        const subtotal = groupItems.reduce(
          (sum, i) => sum + Number(i.product.harga) * i.qty,
          0,
        );
        grandTotal += subtotal + 10000; // shipping
      }

      const payment = await tx.payment.create({
        data: {
          midtransOrderId,
          jumlah: grandTotal,
          status: paymentStatus,
        },
      });

      for (const [sellerId, groupItems] of sellerGroups.entries()) {
        const subtotal = groupItems.reduce(
          (sum, i) => sum + Number(i.product.harga) * i.qty,
          0,
        );
        const totalHarga = subtotal + 10000;
        const nomorOrder = `TEST-ORD-${Date.now()}-${sellerId}-${Math.floor(1000 + Math.random() * 9000)}`;

        await tx.order.create({
          data: {
            buyerId: buyer.id,
            sellerId,
            nomorOrder,
            totalHarga,
            ongkir: 10000,
            namaPenerima: buyer.nama,
            status: paymentStatus === 'PAID' ? 'DIBAYAR' : 'MENUNGGU_PEMBAYARAN',
            paymentId: payment.id,
            items: {
              create: groupItems.map((i) => ({
                productId: i.product.id,
                jumlah: i.qty,
                hargaSatuan: Number(i.product.harga),
                subtotal: Number(i.product.harga) * i.qty,
              })),
            },
            statusHistory: {
              create: {
                status: paymentStatus === 'PAID' ? 'DIBAYAR' : 'MENUNGGU_PEMBAYARAN',
              },
            },
          },
        });
      }

      return tx.payment.findUnique({
        where: { id: payment.id },
        include: { orders: { include: { items: true } } },
      });
    });
  }

  describe('Endpoint 1: POST /api/v1/payments/:paymentId/snap-token', () => {
    it('Scenario 1: Without token -> 401 Unauthorized', async () => {
      const res = await request(app).post('/api/v1/payments/1/snap-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 2: With SELLER token -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/payments/1/snap-token')
        .set('Authorization', `Bearer ${seller1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 3: With nonexistent paymentId -> 404 NotFoundError', async () => {
      const res = await request(app)
        .post('/api/v1/payments/999999/snap-token')
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("Scenario 4: With another buyer's paymentId -> 404 NotFoundError (ownership isolation)", async () => {
      const payment = await createTestPaymentFixture({
        buyer: buyer2,
        items: [{ product: product1, qty: 1, sellerId: seller1.id }],
      });

      const res = await request(app)
        .post(`/api/v1/payments/${payment.id}/snap-token`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 5: Valid buyer -> 200 OK with snapToken and redirectUrl', async () => {
      const payment = await createTestPaymentFixture({
        buyer: buyer1,
        items: [
          { product: product1, qty: 2, sellerId: seller1.id }, // 80000 + 10000 = 90000
          { product: product2, qty: 1, sellerId: seller2.id }, // 25000 + 10000 = 35000
        ], // grandTotal = 125000
      });

      const res = await request(app)
        .post(`/api/v1/payments/${payment.id}/snap-token`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.snapToken).toBeDefined();
      expect(res.body.data.redirectUrl).toBeDefined();
      expect(res.body.data.snapToken).toContain(`mock-snap-token-${payment.midtransOrderId}`);

      // Verify DB record updated
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment.snapToken).toBe(res.body.data.snapToken);
      expect(updatedPayment.snapRedirectUrl).toBe(res.body.data.redirectUrl);

      // Verify repeated call returns cached token without re-calling Midtrans createTransaction
      const snapSpy = vi.spyOn(snap, 'createTransaction');
      snapSpy.mockClear();

      const repeatRes = await request(app)
        .post(`/api/v1/payments/${payment.id}/snap-token`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.data.snapToken).toBe(res.body.data.snapToken);
      expect(snapSpy).not.toHaveBeenCalled();
    });

    it('Scenario 6: Call on already PAID payment -> 400 BadRequestError', async () => {
      const payment = await createTestPaymentFixture({
        buyer: buyer1,
        items: [{ product: product1, qty: 1, sellerId: seller1.id }],
        paymentStatus: 'PAID',
      });

      const res = await request(app)
        .post(`/api/v1/payments/${payment.id}/snap-token`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Pembayaran sudah lunas');
    });
  });

  describe('Endpoint 2: POST /api/v1/payments/midtrans/webhook', () => {
    it('Scenario 7: Webhook with invalid signature -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: 'TEST-ORD-INVALID',
          status_code: '200',
          gross_amount: '50000.00',
          signature_key: 'invalid-signature-hex',
          transaction_status: 'settlement',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Signature');
    });

    it('Scenario 8: Webhook with nonexistent order_id -> 404 NotFoundError', async () => {
      const orderId = 'NONEXISTENT-PAY-999';
      const statusCode = '200';
      const grossAmount = '50000.00';
      const signatureKey = generateSignature(orderId, statusCode, grossAmount);

      const res = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: 'settlement',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 9: Successful settlement -> Payment PAID, Orders DIBAYAR, stock decremented, cart cleared, notifications sent', async () => {
      const initialStock1 = 100;
      const initialStock2 = 80;

      // Ensure buyer cart has items to verify cart clearing
      const cart = await prisma.cart.upsert({
        where: { buyerId: buyer1.id },
        update: {},
        create: { buyerId: buyer1.id },
      });
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product1.id,
          jumlah: 2,
          subtotal: 80000,
        },
      });

      const payment = await createTestPaymentFixture({
        buyer: buyer1,
        items: [
          { product: product1, qty: 3, sellerId: seller1.id },
          { product: product2, qty: 2, sellerId: seller2.id },
        ],
      });

      const orderId = payment.midtransOrderId;
      const statusCode = '200';
      const grossAmount = `${Number(payment.jumlah)}.00`;
      const signatureKey = generateSignature(orderId, statusCode, grossAmount);

      const res = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: 'settlement',
          payment_type: 'bank_transfer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify Payment record
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment.status).toBe('PAID');
      expect(updatedPayment.paidAt).not.toBeNull();
      expect(updatedPayment.metodePembayaran).toBe('bank_transfer');

      // Verify Orders & OrderStatusHistory
      const updatedOrders = await prisma.order.findMany({
        where: { paymentId: payment.id },
        include: { statusHistory: true },
      });
      expect(updatedOrders).toHaveLength(2);
      for (const order of updatedOrders) {
        expect(order.status).toBe('DIBAYAR');
        expect(order.statusHistory.some((h) => h.status === 'DIBAYAR')).toBe(true);
      }

      // Verify Product stock decremented
      const updatedP1 = await prisma.product.findUnique({ where: { id: product1.id } });
      const updatedP2 = await prisma.product.findUnique({ where: { id: product2.id } });
      expect(updatedP1.stok).toBe(initialStock1 - 3);
      expect(updatedP2.stok).toBe(initialStock2 - 2);

      // Verify Buyer Cart cleared
      const remainingCartItems = await prisma.cartItem.findMany({
        where: { cartId: cart.id },
      });
      expect(remainingCartItems).toHaveLength(0);

      // Verify Seller Notifications created
      const notifsSeller1 = await prisma.notification.findMany({
        where: { userId: seller1.id },
      });
      const notifsSeller2 = await prisma.notification.findMany({
        where: { userId: seller2.id },
      });
      expect(notifsSeller1.length).toBeGreaterThanOrEqual(1);
      expect(notifsSeller2.length).toBeGreaterThanOrEqual(1);
      expect(notifsSeller1[0].pesan).toContain('telah dibayar');

      // Scenario 10: Idempotency -> Second settlement webhook should respond 200 without re-decrementing stock
      const stockBeforeSecondCallP1 = updatedP1.stok;
      const stockBeforeSecondCallP2 = updatedP2.stok;
      const notifCountBefore = notifsSeller1.length;

      const repeatRes = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: 'settlement',
          payment_type: 'bank_transfer',
        });

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.data.message).toContain('Pembayaran sudah diproses sebelumnya');

      const p1AfterRepeat = await prisma.product.findUnique({ where: { id: product1.id } });
      const p2AfterRepeat = await prisma.product.findUnique({ where: { id: product2.id } });
      const notifsAfterRepeat = await prisma.notification.findMany({ where: { userId: seller1.id } });

      expect(p1AfterRepeat.stok).toBe(stockBeforeSecondCallP1);
      expect(p2AfterRepeat.stok).toBe(stockBeforeSecondCallP2);
      expect(notifsAfterRepeat.length).toBe(notifCountBefore);
    });

    it('Scenario 11: Webhook capture with fraud_status accept -> Payment PAID', async () => {
      const payment = await createTestPaymentFixture({
        buyer: buyer1,
        items: [{ product: product1, qty: 1, sellerId: seller1.id }],
      });

      const orderId = payment.midtransOrderId;
      const statusCode = '200';
      const grossAmount = `${Number(payment.jumlah)}.00`;
      const signatureKey = generateSignature(orderId, statusCode, grossAmount);

      const res = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: 'capture',
          fraud_status: 'accept',
          payment_type: 'credit_card',
        });

      expect(res.status).toBe(200);
      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('PAID');
    });

    it('Scenario 12: Webhook expire status -> Payment EXPIRED, Orders DIBATALKAN', async () => {
      const payment = await createTestPaymentFixture({
        buyer: buyer1,
        items: [{ product: product1, qty: 1, sellerId: seller1.id }],
      });

      const pBefore = await prisma.product.findUnique({ where: { id: product1.id } });

      const orderId = payment.midtransOrderId;
      const statusCode = '200';
      const grossAmount = `${Number(payment.jumlah)}.00`;
      const signatureKey = generateSignature(orderId, statusCode, grossAmount);

      const res = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: 'expire',
        });

      expect(res.status).toBe(200);

      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('EXPIRED');

      const updatedOrders = await prisma.order.findMany({
        where: { paymentId: payment.id },
        include: { statusHistory: true },
      });
      for (const order of updatedOrders) {
        expect(order.status).toBe('DIBATALKAN');
        expect(order.statusHistory.some((h) => h.status === 'DIBATALKAN')).toBe(true);
      }

      // Stock should remain unchanged
      const pAfter = await prisma.product.findUnique({ where: { id: product1.id } });
      expect(pAfter.stok).toBe(pBefore.stok);
    });

    it('Scenario 13: Webhook cancel/deny status -> Payment FAILED, Orders DIBATALKAN', async () => {
      const payment = await createTestPaymentFixture({
        buyer: buyer1,
        items: [{ product: product1, qty: 1, sellerId: seller1.id }],
      });

      const orderId = payment.midtransOrderId;
      const statusCode = '200';
      const grossAmount = `${Number(payment.jumlah)}.00`;
      const signatureKey = generateSignature(orderId, statusCode, grossAmount);

      const res = await request(app)
        .post('/api/v1/payments/midtrans/webhook')
        .send({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: 'cancel',
        });

      expect(res.status).toBe(200);

      const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe('FAILED');

      const updatedOrders = await prisma.order.findMany({ where: { paymentId: payment.id } });
      for (const order of updatedOrders) {
        expect(order.status).toBe('DIBATALKAN');
      }
    });
  });
});
