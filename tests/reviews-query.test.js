import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const seller1Email = `seller1.revqry.${testRunId}@mail.com`;
const seller2Email = `seller2.revqry.${testRunId}@mail.com`;
const sellerEmptyEmail = `sellerempty.revqry.${testRunId}@mail.com`;
const buyer1Email = `buyer1.revqry.${testRunId}@mail.com`;
const buyer2Email = `buyer2.revqry.${testRunId}@mail.com`;

let seller1;
let seller2;
let sellerEmpty;
let buyer1;
let buyer2;
let seller1Token;
let sellerEmptyToken;
let buyer1Token;
let product1;
let product2;
let deletedProduct;
let otherSellerProduct;
let createdOrderIds = [];

describe('Module: Public & Seller Review Listing (UC-22)', () => {
  beforeAll(async () => {
    seller1 = await prisma.user.create({
      data: {
        nama: 'Petani Satu Query',
        email: seller1Email,
        noTelepon: '081288880001',
        passwordHash: 'secret-hash-1',
        role: 'SELLER',
      },
    });

    seller2 = await prisma.user.create({
      data: {
        nama: 'Petani Dua Query',
        email: seller2Email,
        noTelepon: '081288880002',
        passwordHash: 'secret-hash-2',
        role: 'SELLER',
      },
    });

    sellerEmpty = await prisma.user.create({
      data: {
        nama: 'Petani Kosong Query',
        email: sellerEmptyEmail,
        noTelepon: '081288880003',
        passwordHash: 'secret-hash-3',
        role: 'SELLER',
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Budi Santoso',
        email: buyer1Email,
        noTelepon: '081288880004',
        passwordHash: 'secret-buyer-hash-1',
        role: 'BUYER',
      },
    });

    buyer2 = await prisma.user.create({
      data: {
        nama: 'Siti Aminah',
        email: buyer2Email,
        noTelepon: '081288880005',
        passwordHash: 'secret-buyer-hash-2',
        role: 'BUYER',
      },
    });

    seller1Token = jwt.sign({ sub: seller1.id, role: seller1.role }, env.JWT_SECRET, { expiresIn: '1h' });
    sellerEmptyToken = jwt.sign({ sub: sellerEmpty.id, role: sellerEmpty.role }, env.JWT_SECRET, {
      expiresIn: '1h',
    });
    buyer1Token = jwt.sign({ sub: buyer1.id, role: buyer1.role }, env.JWT_SECRET, { expiresIn: '1h' });

    product1 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Jeruk Siam Madu',
        harga: 22000,
        stok: 40,
        satuan: 'kg',
      },
    });

    product2 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Alpukat Mentega',
        harga: 35000,
        stok: 30,
        satuan: 'kg',
      },
    });

    deletedProduct = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: 'Produk Terhapus',
        harga: 15000,
        stok: 0,
        satuan: 'kg',
        deletedAt: new Date(),
      },
    });

    otherSellerProduct = await prisma.product.create({
      data: {
        sellerId: seller2.id,
        nama: 'Apel Malang',
        harga: 28000,
        stok: 25,
        satuan: 'kg',
      },
    });

    const createReviewFor = async ({ buyerId, sellerId, prodId, suffix, rating, komentar, tanggal }) => {
      const order = await prisma.order.create({
        data: {
          buyerId,
          sellerId,
          nomorOrder: `ORD-RQ-${testRunId}-${suffix}`,
          totalHarga: 32000,
          ongkir: 10000,
          namaPenerima: 'Penerima Query',
          status: 'SELESAI',
          items: {
            create: {
              productId: prodId,
              jumlah: 1,
              hargaSatuan: 22000,
              subtotal: 22000,
            },
          },
        },
        include: { items: true },
      });
      createdOrderIds.push(order.id);

      return prisma.review.create({
        data: {
          buyerId,
          orderItemId: order.items[0].id,
          productId: prodId,
          rating,
          komentar,
          tanggal,
        },
      });
    };

    const baseTime = new Date('2026-11-22T10:00:00.000Z');
    await createReviewFor({
      buyerId: buyer1.id,
      sellerId: seller1.id,
      prodId: product1.id,
      suffix: '1',
      rating: 5,
      komentar: 'Jeruknya manis sekali',
      tanggal: new Date(baseTime.getTime() + 1000),
    });
    await createReviewFor({
      buyerId: buyer2.id,
      sellerId: seller1.id,
      prodId: product1.id,
      suffix: '2',
      rating: 4,
      komentar: 'Segar dan tidak ada yang busuk',
      tanggal: new Date(baseTime.getTime() + 2000),
    });
    await createReviewFor({
      buyerId: buyer1.id,
      sellerId: seller1.id,
      prodId: product2.id,
      suffix: '3',
      rating: 4,
      komentar: 'Alpukat pulen dan matang pas',
      tanggal: new Date(baseTime.getTime() + 3000),
    });
    await createReviewFor({
      buyerId: buyer2.id,
      sellerId: seller2.id,
      prodId: otherSellerProduct.id,
      suffix: '4',
      rating: 2,
      komentar: 'Ulasan milik seller lain',
      tanggal: new Date(baseTime.getTime() + 4000),
    });
  });

  afterAll(async () => {
    const productIds = [product1?.id, product2?.id, deletedProduct?.id, otherSellerProduct?.id].filter(Boolean);
    const userIds = [seller1?.id, seller2?.id, sellerEmpty?.id, buyer1?.id, buyer2?.id].filter(Boolean);

    if (productIds.length > 0) {
      await prisma.review.deleteMany({ where: { productId: { in: productIds } } });
    }
    if (createdOrderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (productIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  describe('GET /api/v1/products/:id/reviews (Public)', () => {
    it('returns paginated reviews with buyer display name and without sensitive fields', async () => {
      const res = await request(app).get(`/api/v1/products/${product1.id}/reviews?page=1&limit=1`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].buyer).toEqual({
        id: buyer2.id,
        nama: 'Siti Aminah',
      });
      expect(res.body.data[0].buyer.email).toBeUndefined();
      expect(res.body.data[0].buyer.noTelepon).toBeUndefined();
      expect(res.body.data[0].buyer.passwordHash).toBeUndefined();
      expect(res.body.data[0].rating).toBe(4);
      expect(res.body.data[0].komentar).toBe('Segar dan tidak ada yang busuk');
      expect(res.body.data[0].tanggal).toBeTruthy();
    });

    it('returns 404 when product does not exist or is soft-deleted', async () => {
      const notFoundRes = await request(app).get('/api/v1/products/999999999/reviews');
      expect(notFoundRes.status).toBe(404);

      const deletedRes = await request(app).get(`/api/v1/products/${deletedProduct.id}/reviews`);
      expect(deletedRes.status).toBe(404);
    });

    it('returns 400 on invalid product id or pagination query', async () => {
      const badId = await request(app).get('/api/v1/products/abc/reviews');
      expect(badId.status).toBe(400);

      const badQuery = await request(app).get(`/api/v1/products/${product1.id}/reviews?page=0&limit=100`);
      expect(badQuery.status).toBe(400);
    });
  });

  describe('GET /api/v1/seller/reviews (SELLER)', () => {
    it('rejects unauthenticated (401) and non-SELLER role (403)', async () => {
      const unauth = await request(app).get('/api/v1/seller/reviews');
      expect(unauth.status).toBe(401);

      const asBuyer = await request(app)
        .get('/api/v1/seller/reviews')
        .set('Authorization', `Bearer ${buyer1Token}`);
      expect(asBuyer.status).toBe(403);
    });

    it('returns paginated reviews scoped to sellerId with aggregate summary', async () => {
      const res = await request(app)
        .get('/api/v1/seller/reviews?page=1&limit=2')
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // seller1 has 3 reviews: ratings 5, 4, 4 -> avg 4.33
      expect(res.body.data.summary).toEqual({
        averageRating: 4.33,
        totalReviews: 3,
      });
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
      expect(res.body.data.reviews).toHaveLength(2);
      expect(res.body.data.reviews[0].product.nama).toBe('Alpukat Mentega');
      expect(res.body.data.reviews[0].buyer).toEqual({
        id: buyer1.id,
        nama: 'Budi Santoso',
      });
      expect(res.body.data.reviews[0].buyer.email).toBeUndefined();
      expect(res.body.data.reviews[0].buyer.noTelepon).toBeUndefined();
      expect(res.body.data.reviews[0].buyer.passwordHash).toBeUndefined();
    });

    it('returns zeroed summary and empty reviews when seller has no reviews', async () => {
      const res = await request(app)
        .get('/api/v1/seller/reviews')
        .set('Authorization', `Bearer ${sellerEmptyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        summary: {
          averageRating: 0,
          totalReviews: 0,
        },
        reviews: [],
      });
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it('returns 400 on invalid pagination query', async () => {
      const res = await request(app)
        .get('/api/v1/seller/reviews?page=-1')
        .set('Authorization', `Bearer ${seller1Token}`);

      expect(res.status).toBe(400);
    });
  });
});
