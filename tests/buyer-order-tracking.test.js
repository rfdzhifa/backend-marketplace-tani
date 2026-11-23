import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const sellerEmail = `seller.track.${testRunId}@mail.com`;
const buyer1Email = `buyer1.track.${testRunId}@mail.com`;
const buyer2Email = `buyer2.track.${testRunId}@mail.com`;

let seller;
let buyer1;
let buyer2;
let sellerToken;
let buyer1Token;
let product;
let payment1;
let order1;
let order2;
let order3;
let otherBuyerOrder;

describe('Module: Buyer Order Tracking & History (UC-12, UC-13)', () => {
  beforeAll(async () => {
    seller = await prisma.user.create({
      data: {
        nama: 'Petani Tracking',
        email: sellerEmail,
        noTelepon: '081233330001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Organik Tracking',
            deskripsi: 'Sayuran segar harian',
            lokasi: 'Lembang, Bandung',
          },
        },
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Pembeli Satu Tracking',
        email: buyer1Email,
        noTelepon: '081233330002',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyer2 = await prisma.user.create({
      data: {
        nama: 'Pembeli Dua Tracking',
        email: buyer2Email,
        noTelepon: '081233330003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    sellerToken = jwt.sign({ sub: seller.id, role: seller.role }, env.JWT_SECRET, { expiresIn: '1h' });
    buyer1Token = jwt.sign({ sub: buyer1.id, role: buyer1.role }, env.JWT_SECRET, { expiresIn: '1h' });

    product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: 'Tomat Cherry Segar',
        harga: 25000,
        stok: 50,
        satuan: 'kg',
      },
    });

    payment1 = await prisma.payment.create({
      data: {
        midtransOrderId: `PAY-TRK-${testRunId}-1`,
        jumlah: 135000,
        status: 'PAID',
        metodePembayaran: 'qris',
        paidAt: new Date(),
      },
    });

    const baseDate = new Date('2026-11-20T10:00:00.000Z');

    order1 = await prisma.order.create({
      data: {
        buyerId: buyer1.id,
        sellerId: seller.id,
        nomorOrder: `ORD-TRK-${testRunId}-1`,
        tanggalOrder: new Date(baseDate.getTime() + 1000),
        totalHarga: 35000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Satu',
        catatan: 'Tolong pilih yang segar',
        status: 'MENUNGGU_PEMBAYARAN',
        items: {
          create: {
            productId: product.id,
            jumlah: 1,
            hargaSatuan: 25000,
            subtotal: 25000,
          },
        },
        statusHistory: {
          create: [{ status: 'MENUNGGU_PEMBAYARAN', waktuPerubahan: new Date(baseDate.getTime() + 1000) }],
        },
      },
    });

    order2 = await prisma.order.create({
      data: {
        buyerId: buyer1.id,
        sellerId: seller.id,
        nomorOrder: `ORD-TRK-${testRunId}-2`,
        tanggalOrder: new Date(baseDate.getTime() + 2000),
        totalHarga: 60000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Satu',
        status: 'DIBAYAR',
        paymentId: payment1.id,
        items: {
          create: {
            productId: product.id,
            jumlah: 2,
            hargaSatuan: 25000,
            subtotal: 50000,
          },
        },
        statusHistory: {
          create: [
            { status: 'MENUNGGU_PEMBAYARAN', waktuPerubahan: new Date(baseDate.getTime() + 2000) },
            { status: 'DIBAYAR', waktuPerubahan: new Date(baseDate.getTime() + 3000) },
          ],
        },
      },
    });

    order3 = await prisma.order.create({
      data: {
        buyerId: buyer1.id,
        sellerId: seller.id,
        nomorOrder: `ORD-TRK-${testRunId}-3`,
        tanggalOrder: new Date(baseDate.getTime() + 4000),
        totalHarga: 85000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Satu',
        status: 'DIPROSES',
        paymentId: payment1.id,
        items: {
          create: {
            productId: product.id,
            jumlah: 3,
            hargaSatuan: 25000,
            subtotal: 75000,
          },
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

    otherBuyerOrder = await prisma.order.create({
      data: {
        buyerId: buyer2.id,
        sellerId: seller.id,
        nomorOrder: `ORD-TRK-${testRunId}-4`,
        tanggalOrder: new Date(baseDate.getTime() + 7000),
        totalHarga: 35000,
        ongkir: 10000,
        namaPenerima: 'Pembeli Dua',
        status: 'DIBAYAR',
        items: {
          create: {
            productId: product.id,
            jumlah: 1,
            hargaSatuan: 25000,
            subtotal: 25000,
          },
        },
        statusHistory: {
          create: [{ status: 'DIBAYAR', waktuPerubahan: new Date(baseDate.getTime() + 7000) }],
        },
      },
    });
  });

  afterAll(async () => {
    const orderIds = [order1?.id, order2?.id, order3?.id, otherBuyerOrder?.id].filter(Boolean);
    if (orderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (payment1) {
      await prisma.payment.deleteMany({ where: { id: payment1.id } });
    }
    if (product) {
      await prisma.product.deleteMany({ where: { id: product.id } });
    }
    const userIds = [seller?.id, buyer1?.id, buyer2?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.farmerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/v1/orders', () => {
    it('mengembalikan daftar pesanan milik buyer dengan urutan terbaru, info seller, items, dan pagination', async () => {
      const res = await request(app)
        .get('/api/v1/orders?page=1&limit=2')
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });

      // Sorted descending by tanggalOrder
      expect(res.body.data[0].id).toBe(order3.id);
      expect(res.body.data[1].id).toBe(order2.id);

      const firstOrder = res.body.data[0];
      expect(firstOrder.seller).toMatchObject({
        id: seller.id,
        namaUsaha: 'Kebun Organik Tracking',
        lokasi: 'Lembang, Bandung',
      });
      expect(firstOrder.itemsCount).toBe(1);
      expect(firstOrder.items).toHaveLength(1);
      expect(firstOrder.totalHarga).toBe(85000);
      expect(firstOrder.ongkir).toBe(10000);
      expect(firstOrder.itemsSubtotal).toBe(75000);
      expect(firstOrder.payment).toMatchObject({
        id: payment1.id,
        status: 'PAID',
        metodePembayaran: 'qris',
      });
    });

    it('mendukung filter status dan tidak menampilkan pesanan buyer lain', async () => {
      const res = await request(app)
        .get('/api/v1/orders?status=DIBAYAR')
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(order2.id);
      expect(res.body.data[0].status).toBe('DIBAYAR');
    });

    it('menolak query status atau pagination tidak valid dengan 400', async () => {
      const res = await request(app)
        .get('/api/v1/orders?status=INVALID_STATUS&page=0')
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('menolak akses tanpa token (401) dan role SELLER (403)', async () => {
      const noAuth = await request(app).get('/api/v1/orders');
      expect(noAuth.status).toBe(401);

      const wrongRole = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${sellerToken}`);
      expect(wrongRole.status).toBe(403);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('mengembalikan detail lengkap pesanan termasuk items, seller, payment, dan statusHistory kronologis', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${order3.id}`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(order3.id);
      expect(res.body.data.nomorOrder).toBe(order3.nomorOrder);
      expect(res.body.data.seller.namaUsaha).toBe('Kebun Organik Tracking');
      expect(res.body.data.payment.midtransOrderId).toBe(payment1.midtransOrderId);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toMatchObject({
        productId: product.id,
        nama: 'Tomat Cherry Segar',
        jumlah: 3,
        hargaSatuan: 25000,
        subtotal: 75000,
      });
      expect(res.body.data.statusHistory.map((h) => h.status)).toEqual([
        'MENUNGGU_PEMBAYARAN',
        'DIBAYAR',
        'DIPROSES',
      ]);
    });

    it('mengembalikan 404 saat buyer mengakses pesanan milik buyer lain (anti ID enumeration)', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${otherBuyerOrder.id}`)
        .set('Authorization', `Bearer ${buyer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('mengembalikan 404 untuk order ID yang tidak ada dan 400 untuk ID tidak valid', async () => {
      const notFound = await request(app)
        .get('/api/v1/orders/9999999')
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(notFound.status).toBe(404);

      const badId = await request(app)
        .get('/api/v1/orders/abc')
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(badId.status).toBe(400);
    });
  });
});
