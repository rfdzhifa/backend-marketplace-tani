import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const sellerEmail = `seller.confirm.${testRunId}@mail.com`;
const buyer1Email = `buyer1.confirm.${testRunId}@mail.com`;
const buyer2Email = `buyer2.confirm.${testRunId}@mail.com`;

let seller;
let buyer1;
let buyer2;
let sellerToken;
let buyer1Token;
let buyer2Token;
let product;
let orderShipped;
let orderPending;
let orderPaid;
let orderProcessing;
let orderCancelled;

describe('Module: Buyer Order Receipt Confirmation (UC-14)', () => {
  beforeAll(async () => {
    seller = await prisma.user.create({
      data: {
        nama: 'Petani Confirm',
        email: sellerEmail,
        noTelepon: '081255550001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Pembeli Satu Confirm',
        email: buyer1Email,
        noTelepon: '081255550002',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyer2 = await prisma.user.create({
      data: {
        nama: 'Pembeli Dua Confirm',
        email: buyer2Email,
        noTelepon: '081255550003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    sellerToken = jwt.sign({ sub: seller.id, role: seller.role }, env.JWT_SECRET, { expiresIn: '1h' });
    buyer1Token = jwt.sign({ sub: buyer1.id, role: buyer1.role }, env.JWT_SECRET, { expiresIn: '1h' });
    buyer2Token = jwt.sign({ sub: buyer2.id, role: buyer2.role }, env.JWT_SECRET, { expiresIn: '1h' });

    product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: 'Beras Organik Pandan Wangi',
        harga: 75000,
        stok: 15,
        satuan: 'kg',
      },
    });

    const createOrderWithStatus = (suffix, status) =>
      prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller.id,
          nomorOrder: `ORD-CNF-${testRunId}-${suffix}`,
          totalHarga: 85000,
          ongkir: 10000,
          namaPenerima: 'Pembeli Satu Confirm',
          status,
          items: {
            create: { productId: product.id, jumlah: 1, hargaSatuan: 75000, subtotal: 75000 },
          },
          statusHistory: {
            create: [{ status }],
          },
        },
      });

    orderShipped = await createOrderWithStatus('1', 'DIKIRIM');
    orderPending = await createOrderWithStatus('2', 'MENUNGGU_PEMBAYARAN');
    orderPaid = await createOrderWithStatus('3', 'DIBAYAR');
    orderProcessing = await createOrderWithStatus('4', 'DIPROSES');
    orderCancelled = await createOrderWithStatus('5', 'DIBATALKAN');
  });

  afterAll(async () => {
    const orderIds = [
      orderShipped?.id,
      orderPending?.id,
      orderPaid?.id,
      orderProcessing?.id,
      orderCancelled?.id,
    ].filter(Boolean);
    const userIds = [seller?.id, buyer1?.id, buyer2?.id].filter(Boolean);

    if (userIds.length > 0) {
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    }
    if (orderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (product) {
      await prisma.product.deleteMany({ where: { id: product.id } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it('mengonfirmasi pesanan DIKIRIM -> SELESAI, mencatat OrderStatusHistory dan Notification seller', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${orderShipped.id}/confirm-received`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('SELESAI');
    expect(res.body.data.statusHistory.map((h) => h.status)).toContain('SELESAI');

    const notif = await prisma.notification.findFirst({
      where: { userId: seller.id, pesan: { contains: orderShipped.nomorOrder } },
    });
    expect(notif).not.toBeNull();
  });

  it('menolak konfirmasi jika status bukan DIKIRIM (400)', async () => {
    for (const order of [orderPending, orderPaid, orderProcessing, orderCancelled]) {
      const res = await request(app)
        .patch(`/api/v1/orders/${order.id}/confirm-received`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    }
  });

  it('mengembalikan 404 saat diakses oleh buyer lain atau order ID tidak ada', async () => {
    const otherBuyer = await request(app)
      .patch(`/api/v1/orders/${orderPaid.id}/confirm-received`)
      .set('Authorization', `Bearer ${buyer2Token}`);
    expect(otherBuyer.status).toBe(404);

    const notFound = await request(app)
      .patch('/api/v1/orders/9999999/confirm-received')
      .set('Authorization', `Bearer ${buyer1Token}`);
    expect(notFound.status).toBe(404);
  });

  it('menolak akses tanpa token (401) dan role SELLER (403)', async () => {
    const noAuth = await request(app).patch(`/api/v1/orders/${orderPaid.id}/confirm-received`);
    expect(noAuth.status).toBe(401);

    const wrongRole = await request(app)
      .patch(`/api/v1/orders/${orderPaid.id}/confirm-received`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(wrongRole.status).toBe(403);
  });
});
