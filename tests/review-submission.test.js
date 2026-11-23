import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const sellerEmail = `seller.revsub.${testRunId}@mail.com`;
const buyer1Email = `buyer1.revsub.${testRunId}@mail.com`;
const buyer2Email = `buyer2.revsub.${testRunId}@mail.com`;

let seller;
let buyer1;
let buyer2;
let sellerToken;
let buyer1Token;
let buyer2Token;
let product;
let orderCompleted1;
let orderCompleted2;
let orderCompleted3;
let orderShipped;
let orderItemCompleted1;
let orderItemCompleted2;
let orderItemCompleted3;
let orderItemShipped;

describe('Module: Buyer Review Submission & Rating Recalculation (UC-15)', () => {
  beforeAll(async () => {
    seller = await prisma.user.create({
      data: {
        nama: 'Petani Review',
        email: sellerEmail,
        noTelepon: '081277770001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Pembeli Satu Review',
        email: buyer1Email,
        noTelepon: '081277770002',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyer2 = await prisma.user.create({
      data: {
        nama: 'Pembeli Dua Review',
        email: buyer2Email,
        noTelepon: '081277770003',
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
        nama: 'Mangga Harum Manis',
        harga: 30000,
        stok: 50,
        satuan: 'kg',
      },
    });

    const createOrderWithItem = async (buyerId, suffix, status) => {
      const order = await prisma.order.create({
        data: {
          buyerId,
          sellerId: seller.id,
          nomorOrder: `ORD-REV-${testRunId}-${suffix}`,
          totalHarga: 40000,
          ongkir: 10000,
          namaPenerima: 'Penerima Test',
          status,
          items: {
            create: {
              productId: product.id,
              jumlah: 1,
              hargaSatuan: 30000,
              subtotal: 30000,
            },
          },
        },
        include: { items: true },
      });
      return { order, orderItem: order.items[0] };
    };

    ({ order: orderCompleted1, orderItem: orderItemCompleted1 } = await createOrderWithItem(
      buyer1.id,
      '1',
      'SELESAI',
    ));
    ({ order: orderCompleted2, orderItem: orderItemCompleted2 } = await createOrderWithItem(
      buyer1.id,
      '2',
      'SELESAI',
    ));
    ({ order: orderCompleted3, orderItem: orderItemCompleted3 } = await createOrderWithItem(
      buyer2.id,
      '3',
      'SELESAI',
    ));
    ({ order: orderShipped, orderItem: orderItemShipped } = await createOrderWithItem(
      buyer1.id,
      '4',
      'DIKIRIM',
    ));
  });

  afterAll(async () => {
    const orderIds = [
      orderCompleted1?.id,
      orderCompleted2?.id,
      orderCompleted3?.id,
      orderShipped?.id,
    ].filter(Boolean);
    const userIds = [seller?.id, buyer1?.id, buyer2?.id].filter(Boolean);

    if (product) {
      await prisma.review.deleteMany({ where: { productId: product.id } });
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
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).post('/api/v1/reviews').send({
      orderItemId: orderItemCompleted1.id,
      rating: 5,
      komentar: 'Buah sangat manis',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-BUYER role (SELLER) with 403', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        orderItemId: orderItemCompleted1.id,
        rating: 5,
        komentar: 'Buah sangat manis',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on invalid Zod payload (rating out of range / short comment)', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        orderItemId: orderItemCompleted1.id,
        rating: 6,
        komentar: 'ok',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('returns 404 when orderItem does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        orderItemId: 999999999,
        rating: 5,
        komentar: 'Produk tidak ada',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when buyer tries to review another buyer orderItem', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({
        orderItemId: orderItemCompleted1.id,
        rating: 5,
        komentar: 'Mencoba mengulas pesanan orang lain',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when order status is not SELESAI', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        orderItemId: orderItemShipped.id,
        rating: 5,
        komentar: 'Pesanan masih dikirim',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates review (201) and recalculates product ratingRataRata (rounded to 2 decimals) & jumlahUlasan', async () => {
    const res1 = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        orderItemId: orderItemCompleted1.id,
        rating: 5,
        komentar: 'Mangga sangat segar dan manis',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.orderItemId).toBe(orderItemCompleted1.id);
    expect(res1.body.data.rating).toBe(5);
    expect(res1.body.data.product.ratingRataRata).toBe(5);
    expect(res1.body.data.product.jumlahUlasan).toBe(1);

    const res2 = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        orderItemId: orderItemCompleted2.id,
        rating: 4,
        komentar: 'Pengemasan rapi dan aman',
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.product.ratingRataRata).toBe(4.5);
    expect(res2.body.data.product.jumlahUlasan).toBe(2);

    const res3 = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({
        orderItemId: orderItemCompleted3.id,
        rating: 4,
        komentar: 'Rasa enak, pengiriman cepat',
      });

    expect(res3.status).toBe(201);
    // (5 + 4 + 4) / 3 = 4.3333... -> rounded to 4.33
    expect(res3.body.data.product.ratingRataRata).toBe(4.33);
    expect(res3.body.data.product.jumlahUlasan).toBe(3);

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    expect(Number(updatedProduct.ratingRataRata)).toBe(4.33);
    expect(updatedProduct.jumlahUlasan).toBe(3);
  });

  it('returns 409 ConflictError when reviewing the same orderItemId twice', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        orderItemId: orderItemCompleted1.id,
        rating: 3,
        komentar: 'Mencoba mengulas ulang item yang sama',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Produk pada pesanan ini sudah pernah diulas');
  });
});
