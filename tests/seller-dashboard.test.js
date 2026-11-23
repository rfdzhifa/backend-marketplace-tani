import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const seller1Email = `seller1.dash.${testRunId}@mail.com`;
const sellerEmptyEmail = `sellerempty.dash.${testRunId}@mail.com`;
const buyer1Email = `buyer1.dash.${testRunId}@mail.com`;

let seller1;
let sellerEmpty;
let buyer1;
let seller1Token;
let sellerEmptyToken;
let buyer1Token;
let createdOrderIds = [];

describe('Module: Seller Dashboard Overview (UC-16)', () => {
  beforeAll(async () => {
    seller1 = await prisma.user.create({
      data: {
        nama: 'Petani Dashboard Satu',
        email: seller1Email,
        noTelepon: '081277770001',
        passwordHash: 'secret-hash-1',
        role: 'SELLER',
      },
    });

    sellerEmpty = await prisma.user.create({
      data: {
        nama: 'Petani Dashboard Kosong',
        email: sellerEmptyEmail,
        noTelepon: '081277770002',
        passwordHash: 'secret-hash-2',
        role: 'SELLER',
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Pembeli Dashboard',
        email: buyer1Email,
        noTelepon: '081277770003',
        passwordHash: 'secret-hash-3',
        role: 'BUYER',
      },
    });

    seller1Token = jwt.sign({ sub: seller1.id, role: seller1.role }, env.JWT_SECRET, { expiresIn: '1h' });
    sellerEmptyToken = jwt.sign({ sub: sellerEmpty.id, role: sellerEmpty.role }, env.JWT_SECRET, {
      expiresIn: '1h',
    });
    buyer1Token = jwt.sign({ sub: buyer1.id, role: buyer1.role }, env.JWT_SECRET, { expiresIn: '1h' });

    const product1 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Tomat Segar',
        harga: 20000,
        stok: 50,
        satuan: 'kg',
      },
    });

    await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Cabai Rawit',
        harga: 40000,
        stok: 30,
        satuan: 'kg',
      },
    });

    await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Produk Dihapus',
        harga: 10000,
        stok: 0,
        satuan: 'kg',
        deletedAt: new Date(),
      },
    });

    const createOrder = async ({ status, itemsSubtotal, ongkir = 10000, suffix, withReviewRating = null }) => {
      const order = await prisma.order.create({
        data: {
          buyerId: buyer1.id,
          sellerId: seller1.id,
          nomorOrder: `ORD-DASH-${testRunId}-${suffix}`,
          totalHarga: itemsSubtotal + ongkir,
          ongkir,
          namaPenerima: 'Pembeli Dashboard',
          status,
          items: {
            create: {
              productId: product1.id,
              jumlah: 1,
              hargaSatuan: itemsSubtotal,
              subtotal: itemsSubtotal,
            },
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(order.id);

      if (withReviewRating !== null) {
        await prisma.review.create({
          data: {
            buyerId: buyer1.id,
            orderItemId: order.items[0].id,
            productId: product1.id,
            rating: withReviewRating,
            komentar: 'Kualitas panen sangat baik!',
          },
        });
      }
    };

    // Included in revenue: DIBAYAR (20k), DIPROSES (30k), DIKIRIM (40k), SELESAI (50k) => 140k net (excluding 10k ongkir each)
    await createOrder({ status: 'MENUNGGU_PEMBAYARAN', itemsSubtotal: 99000, suffix: '1' });
    await createOrder({ status: 'DIBAYAR', itemsSubtotal: 20000, suffix: '2' });
    await createOrder({ status: 'DIPROSES', itemsSubtotal: 30000, suffix: '3' });
    await createOrder({ status: 'DIKIRIM', itemsSubtotal: 40000, suffix: '4' });
    await createOrder({ status: 'SELESAI', itemsSubtotal: 50000, suffix: '5', withReviewRating: 5 });
    await createOrder({ status: 'SELESAI', itemsSubtotal: 0, ongkir: 10000, suffix: '6', withReviewRating: 4 });
    await createOrder({ status: 'DIBATALKAN', itemsSubtotal: 88000, suffix: '7' });
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.review.deleteMany({
        where: { orderItem: { orderId: { in: createdOrderIds } } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    await prisma.product.deleteMany({
      where: { sellerId: { in: [seller1.id, sellerEmpty.id] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [seller1Email, sellerEmptyEmail, buyer1Email] } },
    });
  });

  it('rejects unauthenticated requests with 401 and BUYER role with 403', async () => {
    const noAuth = await request(app).get('/api/v1/seller/dashboard/overview');
    expect(noAuth.status).toBe(401);

    const buyerAuth = await request(app)
      .get('/api/v1/seller/dashboard/overview')
      .set('Authorization', `Bearer ${buyer1Token}`);
    expect(buyerAuth.status).toBe(403);
  });

  it('returns zeroed metrics for a seller without orders, products, or reviews', async () => {
    const res = await request(app)
      .get('/api/v1/seller/dashboard/overview')
      .set('Authorization', `Bearer ${sellerEmptyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalPendapatan: 0,
      jumlahPesanan: {
        total: 0,
        menungguPembayaran: 0,
        dibayar: 0,
        diproses: 0,
        dikirim: 0,
        selesai: 0,
        dibatalkan: 0,
      },
      jumlahProduk: 0,
      rataRataRating: 0,
    });
  });

  it('aggregates net product revenue, order status breakdown, active products, and average rating for seller', async () => {
    const res = await request(app)
      .get('/api/v1/seller/dashboard/overview')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalPendapatan: 140000,
      jumlahPesanan: {
        total: 7,
        menungguPembayaran: 1,
        dibayar: 1,
        diproses: 1,
        dikirim: 1,
        selesai: 2,
        dibatalkan: 1,
      },
      jumlahProduk: 2,
      rataRataRating: 4.5,
    });
  });
});
