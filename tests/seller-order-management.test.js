import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const seller1Email = `seller1.mgmt.${testRunId}@mail.com`;
const seller2Email = `seller2.mgmt.${testRunId}@mail.com`;
const buyerEmail = `buyer.mgmt.${testRunId}@mail.com`;

let seller1;
let seller2;
let buyer;
let seller1Token;
let seller2Token;
let buyerToken;
let product;
let orderPaid;
let orderPending;
let orderProcessing;
let orderOtherSeller;

describe('Module: Seller Order Management & Status Transitions (UC-19, UC-20, UC-21)', () => {
  beforeAll(async () => {
    seller1 = await prisma.user.create({
      data: {
        nama: 'Petani Satu Mgmt',
        email: seller1Email,
        noTelepon: '081244440001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
      },
    });

    seller2 = await prisma.user.create({
      data: {
        nama: 'Petani Dua Mgmt',
        email: seller2Email,
        noTelepon: '081244440002',
        passwordHash: 'dummyhash',
        role: 'SELLER',
      },
    });

    buyer = await prisma.user.create({
      data: {
        nama: 'Pembeli Mgmt',
        email: buyerEmail,
        noTelepon: '081244440003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    seller1Token = jwt.sign({ sub: seller1.id, role: seller1.role }, env.JWT_SECRET, { expiresIn: '1h' });
    seller2Token = jwt.sign({ sub: seller2.id, role: seller2.role }, env.JWT_SECRET, { expiresIn: '1h' });
    buyerToken = jwt.sign({ sub: buyer.id, role: buyer.role }, env.JWT_SECRET, { expiresIn: '1h' });

    product = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Cabai Rawit Merah',
        harga: 40000,
        stok: 20,
        satuan: 'kg',
      },
    });

    const baseDate = new Date('2026-11-21T08:00:00.000Z');

    orderPending = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller1.id,
        nomorOrder: `ORD-MGT-${testRunId}-1`,
        tanggalOrder: new Date(baseDate.getTime() + 1000),
        totalHarga: 50000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Mgmt',
        status: 'MENUNGGU_PEMBAYARAN',
        items: {
          create: { productId: product.id, jumlah: 1, hargaSatuan: 40000, subtotal: 40000 },
        },
        statusHistory: {
          create: [{ status: 'MENUNGGU_PEMBAYARAN', waktuPerubahan: new Date(baseDate.getTime() + 1000) }],
        },
      },
    });

    orderPaid = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller1.id,
        nomorOrder: `ORD-MGT-${testRunId}-2`,
        tanggalOrder: new Date(baseDate.getTime() + 2000),
        totalHarga: 90000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Mgmt',
        catatan: 'Kemas rapi',
        status: 'DIBAYAR',
        items: {
          create: { productId: product.id, jumlah: 2, hargaSatuan: 40000, subtotal: 80000 },
        },
        statusHistory: {
          create: [
            { status: 'MENUNGGU_PEMBAYARAN', waktuPerubahan: new Date(baseDate.getTime() + 2000) },
            { status: 'DIBAYAR', waktuPerubahan: new Date(baseDate.getTime() + 3000) },
          ],
        },
      },
    });

    orderProcessing = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller1.id,
        nomorOrder: `ORD-MGT-${testRunId}-3`,
        tanggalOrder: new Date(baseDate.getTime() + 4000),
        totalHarga: 50000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Mgmt',
        status: 'DIPROSES',
        items: {
          create: { productId: product.id, jumlah: 1, hargaSatuan: 40000, subtotal: 40000 },
        },
        statusHistory: {
          create: [
            { status: 'MENUNGGU_PEMBAYARAN', waktuPerubahan: new Date(baseDate.getTime() + 4000) },
            { status: 'DIBAYAR', waktuPerubahan: new Date(baseDate.getTime() + 5000) },
            { status: 'DIPROSES', waktuPerubahan: new Date(baseDate.getTime() + 6000) },
          ],
        },
      },
    });

    orderOtherSeller = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller2.id,
        nomorOrder: `ORD-MGT-${testRunId}-4`,
        tanggalOrder: new Date(baseDate.getTime() + 7000),
        totalHarga: 50000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Mgmt',
        status: 'DIBAYAR',
        items: {
          create: { productId: product.id, jumlah: 1, hargaSatuan: 40000, subtotal: 40000 },
        },
      },
    });
  });

  afterAll(async () => {
    const orderIds = [orderPending?.id, orderPaid?.id, orderProcessing?.id, orderOtherSeller?.id].filter(Boolean);
    const userIds = [seller1?.id, seller2?.id, buyer?.id].filter(Boolean);
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

  describe('GET /api/v1/seller/orders & GET /api/v1/seller/orders/:id', () => {
    it('mengembalikan daftar pesanan masuk milik seller dengan pagination dan filter status', async () => {
      const res = await request(app)
        .get('/api/v1/seller/orders?page=1&limit=2')
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(res.body.data[0].id).toBe(orderProcessing.id);

      const filtered = await request(app)
        .get('/api/v1/seller/orders?status=DIBAYAR')
        .set('Authorization', `Bearer ${seller1Token}`);
      expect(filtered.status).toBe(200);
      expect(filtered.body.data).toHaveLength(1);
      expect(filtered.body.data[0].id).toBe(orderPaid.id);
    });

    it('mengembalikan detail pesanan masuk untuk seller pemilik dan 404 untuk seller lain', async () => {
      const res = await request(app)
        .get(`/api/v1/seller/orders/${orderPaid.id}`)
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(orderPaid.id);
      expect(res.body.data.catatan).toBe('Kemas rapi');
      expect(res.body.data.buyer.nama).toBe('Pembeli Mgmt');

      const forbiddenRes = await request(app)
        .get(`/api/v1/seller/orders/${orderPaid.id}`)
        .set('Authorization', `Bearer ${seller2Token}`);
      expect(forbiddenRes.status).toBe(404);
    });

    it('menolak akses tanpa token (401) dan role BUYER (403)', async () => {
      const noAuth = await request(app).get('/api/v1/seller/orders');
      expect(noAuth.status).toBe(401);

      const wrongRole = await request(app)
        .get('/api/v1/seller/orders')
        .set('Authorization', `Bearer ${buyerToken}`);
      expect(wrongRole.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/seller/orders/:id/process', () => {
    it('mengubah status DIBAYAR -> DIPROSES, mencatat OrderStatusHistory dan Notification buyer', async () => {
      const res = await request(app)
        .patch(`/api/v1/seller/orders/${orderPaid.id}/process`)
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DIPROSES');
      expect(res.body.data.statusHistory.map((h) => h.status)).toContain('DIPROSES');

      const notif = await prisma.notification.findFirst({
        where: { userId: buyer.id, pesan: { contains: orderPaid.nomorOrder } },
      });
      expect(notif).not.toBeNull();
    });

    it('menolak proses pesanan jika status bukan DIBAYAR (400) atau milik seller lain (404)', async () => {
      const invalidState = await request(app)
        .patch(`/api/v1/seller/orders/${orderPending.id}/process`)
        .set('Authorization', `Bearer ${seller1Token}`);
      expect(invalidState.status).toBe(400);

      const otherSeller = await request(app)
        .patch(`/api/v1/seller/orders/${orderOtherSeller.id}/process`)
        .set('Authorization', `Bearer ${seller1Token}`);
      expect(otherSeller.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/seller/orders/:id/ship', () => {
    it('mengubah status DIPROSES -> DIKIRIM, mencatat OrderStatusHistory dan Notification buyer', async () => {
      const res = await request(app)
        .patch(`/api/v1/seller/orders/${orderProcessing.id}/ship`)
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DIKIRIM');
      expect(res.body.data.statusHistory.map((h) => h.status)).toContain('DIKIRIM');

      const notif = await prisma.notification.findFirst({
        where: { userId: buyer.id, pesan: { contains: orderProcessing.nomorOrder } },
      });
      expect(notif).not.toBeNull();
    });

    it('menolak pengiriman pesanan jika status bukan DIPROSES (400)', async () => {
      const invalidState = await request(app)
        .patch(`/api/v1/seller/orders/${orderPending.id}/ship`)
        .set('Authorization', `Bearer ${seller1Token}`);
      expect(invalidState.status).toBe(400);
    });
  });
});
