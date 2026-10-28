import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const seller1Email = `seller1.prod.${testRunId}@mail.com`;
const seller2Email = `seller2.prod.${testRunId}@mail.com`;
const buyerEmail = `buyer.prod.${testRunId}@mail.com`;

let seller1;
let seller2;
let buyer;

let seller1Token;
let seller2Token;
let buyerToken;

let productSeller1;
let productSeller1OutOfStock;
let productSeller1Deleted;
let productSeller2;

describe('Module: Seller Product Management (UC-17, UC-18)', () => {
  beforeAll(async () => {
    seller1 = await prisma.user.create({
      data: {
        nama: 'Petani Satu Seller Prod',
        email: seller1Email,
        noTelepon: '081211110001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Seller Satu',
            deskripsi: 'Deskripsi kebun seller 1',
            lokasi: 'Lembang',
          },
        },
      },
    });

    seller2 = await prisma.user.create({
      data: {
        nama: 'Petani Dua Seller Prod',
        email: seller2Email,
        noTelepon: '081211110002',
        passwordHash: 'dummyhash',
        role: 'SELLER',
      },
    });

    buyer = await prisma.user.create({
      data: {
        nama: 'Pembeli Prod Test',
        email: buyerEmail,
        noTelepon: '081211110003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    seller1Token = jwt.sign({ sub: seller1.id, role: 'SELLER' }, env.JWT_SECRET, { expiresIn: '1d' });
    seller2Token = jwt.sign({ sub: seller2.id, role: 'SELLER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyerToken = jwt.sign({ sub: buyer.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });

    productSeller1 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Tomat Segar S1 ${testRunId}`,
        harga: 15000,
        stok: 20,
        satuan: 'kg',
        deskripsi: 'Tomat merah segar dari kebun 1',
        gambarUrl: 'https://example.com/tomat.jpg',
      },
    });

    productSeller1OutOfStock = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Cabai Habis S1 ${testRunId}`,
        harga: 40000,
        stok: 0,
        satuan: 'kg',
        deskripsi: 'Cabai stok kosong',
      },
    });

    productSeller1Deleted = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Wortel Hapus S1 ${testRunId}`,
        harga: 12000,
        stok: 10,
        satuan: 'kg',
        deskripsi: 'Wortel sudah dihapus',
        deletedAt: new Date(),
      },
    });

    productSeller2 = await prisma.product.create({
      data: {
        sellerId: seller2.id,
        nama: `Bayam S2 ${testRunId}`,
        harga: 5000,
        stok: 30,
        satuan: 'ikat',
        deskripsi: 'Bayam segar milik seller 2',
      },
    });
  });

  afterAll(async () => {
    const userIds = [seller1?.id, seller2?.id, buyer?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.product.deleteMany({ where: { sellerId: { in: userIds } } });
      await prisma.farmerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it('Scenario 1: Endpoints without token -> 401', async () => {
    const getRes = await request(app).get('/api/v1/seller/products');
    expect(getRes.status).toBe(401);

    const postRes = await request(app).post('/api/v1/seller/products').send({});
    expect(postRes.status).toBe(401);

    const putRes = await request(app).put(`/api/v1/seller/products/${productSeller1.id}`).send({});
    expect(putRes.status).toBe(401);

    const patchRes = await request(app).patch(`/api/v1/seller/products/${productSeller1.id}/stock`).send({});
    expect(patchRes.status).toBe(401);

    const delRes = await request(app).delete(`/api/v1/seller/products/${productSeller1.id}`);
    expect(delRes.status).toBe(401);
  });

  it('Scenario 2: Endpoints with BUYER token -> 403', async () => {
    const getRes = await request(app)
      .get('/api/v1/seller/products')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(getRes.status).toBe(403);
    expect(getRes.body.message).toBe('Anda tidak memiliki akses untuk fitur ini');

    const postRes = await request(app)
      .post('/api/v1/seller/products')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: 'Produk Terlarang',
        price: 10000,
        unit: 'kg',
        stock: 5,
      });
    expect(postRes.status).toBe(403);
  });

  let createdProductId;

  it('Scenario 3: POST valid product -> 201, sellerId from token, ratings 0, isAvailable based on stock', async () => {
    const res = await request(app)
      .post('/api/v1/seller/products')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: `Kentang Dieng ${testRunId}`,
        description: 'Kentang pilihan kualitas super dari Dieng.',
        price: 25000,
        unit: 'kg',
        stock: 50,
        imageUrl: 'https://example.com/kentang.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Produk berhasil disimpan');
    expect(res.body.data).toMatchObject({
      name: `Kentang Dieng ${testRunId}`,
      description: 'Kentang pilihan kualitas super dari Dieng.',
      price: 25000,
      unit: 'kg',
      stock: 50,
      isAvailable: true,
      imageUrl: 'https://example.com/kentang.jpg',
      avgRating: 0,
      reviewCount: 0,
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();

    createdProductId = res.body.data.id;

    // Verify in database
    const dbProduct = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(dbProduct.sellerId).toBe(seller1.id);
  });

  it('Scenario 4: POST invalid name, price, unit, stock, or image URL -> 400 with field errors', async () => {
    const res = await request(app)
      .post('/api/v1/seller/products')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: 'A', // min 2
        price: 0, // min 1
        unit: '', // min 1
        stock: -1, // min 0
        imageUrl: 'not-a-valid-url',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some((e) => e.field === 'name')).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'price')).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'unit')).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'stock')).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'imageUrl')).toBe(true);
  });

  it('Scenario 5: POST body includes another sellerId -> Ignored; belongs to authenticated seller', async () => {
    const res = await request(app)
      .post('/api/v1/seller/products')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        sellerId: seller2.id, // spoofed sellerId
        name: `Jagung Manis ${testRunId}`,
        price: 10000,
        unit: 'kg',
        stock: 15,
      });

    expect(res.status).toBe(201);
    const dbProduct = await prisma.product.findUnique({ where: { id: res.body.data.id } });
    expect(dbProduct.sellerId).toBe(seller1.id);
  });

  it('Scenario 6: GET list -> Only the authenticated seller active products', async () => {
    const res = await request(app)
      .get('/api/v1/seller/products')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const ids = res.body.data.map((p) => p.id);
    expect(ids).toContain(productSeller1.id);
    expect(ids).toContain(productSeller1OutOfStock.id);
    expect(ids).not.toContain(productSeller1Deleted.id); // soft-deleted excluded
    expect(ids).not.toContain(productSeller2.id); // seller 2 excluded
  });

  it('Scenario 7: GET list with status=available -> Only stock > 0', async () => {
    const res = await request(app)
      .get('/api/v1/seller/products?status=available')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.stock > 0 && p.isAvailable === true)).toBe(true);
    const ids = res.body.data.map((p) => p.id);
    expect(ids).toContain(productSeller1.id);
    expect(ids).not.toContain(productSeller1OutOfStock.id);
  });

  it('Scenario 8: GET list with status=out_of_stock -> Only stock = 0', async () => {
    const res = await request(app)
      .get('/api/v1/seller/products?status=out_of_stock')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((p) => p.stock === 0 && p.isAvailable === false)).toBe(true);
    const ids = res.body.data.map((p) => p.id);
    expect(ids).toContain(productSeller1OutOfStock.id);
    expect(ids).not.toContain(productSeller1.id);
  });

  it('Scenario 9: GET list pagination -> Correct slice and meta', async () => {
    const res = await request(app)
      .get('/api/v1/seller/products?page=1&limit=2')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 2,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );
  });

  it('Scenario 10: GET list invalid status, page, or limit -> 400', async () => {
    const resStatus = await request(app)
      .get('/api/v1/seller/products?status=invalid_status')
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resStatus.status).toBe(400);

    const resPage = await request(app)
      .get('/api/v1/seller/products?page=0')
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resPage.status).toBe(400);

    const resLimit = await request(app)
      .get('/api/v1/seller/products?limit=100')
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resLimit.status).toBe(400);
  });

  it('Scenario 11: GET /seller/products/:id own product -> 200 with description and timestamps', async () => {
    const res = await request(app)
      .get(`/api/v1/seller/products/${productSeller1.id}`)
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: productSeller1.id,
      name: productSeller1.nama,
      description: productSeller1.deskripsi,
      price: 15000,
      stock: 20,
      unit: 'kg',
      isAvailable: true,
      imageUrl: 'https://example.com/tomat.jpg',
    });
    expect(res.body.data.createdAt).toBeDefined();
    expect(res.body.data.updatedAt).toBeDefined();
  });

  it('Scenario 12: GET another seller product, deleted product, or missing id -> 404', async () => {
    const resForeign = await request(app)
      .get(`/api/v1/seller/products/${productSeller1.id}`)
      .set('Authorization', `Bearer ${seller2Token}`);
    expect(resForeign.status).toBe(404);
    expect(resForeign.body.message).toBe('Produk tidak ditemukan');

    const resDeleted = await request(app)
      .get(`/api/v1/seller/products/${productSeller1Deleted.id}`)
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resDeleted.status).toBe(404);
    expect(resDeleted.body.message).toBe('Produk tidak ditemukan');

    const resMissing = await request(app)
      .get('/api/v1/seller/products/999999')
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resMissing.status).toBe(404);
    expect(resMissing.body.message).toBe('Produk tidak ditemukan');
  });

  it('Scenario 13: GET /seller/products/abc -> 400', async () => {
    const res = await request(app)
      .get('/api/v1/seller/products/abc')
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 14: PUT own product -> 200, editable fields updated, sellerId unchanged', async () => {
    const res = await request(app)
      .put(`/api/v1/seller/products/${createdProductId}`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: `Kentang Dieng Super ${testRunId}`,
        description: 'Deskripsi diperbarui.',
        price: 30000,
        unit: 'kg',
        stock: 45,
        imageUrl: 'https://example.com/kentang-new.jpg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Produk berhasil diperbarui');
    expect(res.body.data).toMatchObject({
      id: createdProductId,
      name: `Kentang Dieng Super ${testRunId}`,
      description: 'Deskripsi diperbarui.',
      price: 30000,
      unit: 'kg',
      stock: 45,
      isAvailable: true,
      imageUrl: 'https://example.com/kentang-new.jpg',
    });

    const dbProduct = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(dbProduct.sellerId).toBe(seller1.id);
  });

  it('Scenario 15: PUT another seller product -> 404', async () => {
    const res = await request(app)
      .put(`/api/v1/seller/products/${productSeller2.id}`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: 'Mencoba Update',
        price: 20000,
        unit: 'kg',
        stock: 10,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Produk tidak ditemukan');
  });

  it('Scenario 16: PUT invalid payload -> 400, product unchanged', async () => {
    const res = await request(app)
      .put(`/api/v1/seller/products/${createdProductId}`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: '',
        price: -500,
        stock: -1,
      });

    expect(res.status).toBe(400);

    const getRes = await request(app)
      .get(`/api/v1/seller/products/${createdProductId}`)
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(getRes.body.data.price).toBe(30000);
  });

  it('Scenario 17: PATCH /stock own product -> 200, stock updated', async () => {
    const res = await request(app)
      .patch(`/api/v1/seller/products/${createdProductId}/stock`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stock: 12 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Stok berhasil diperbarui');
    expect(res.body.data.stock).toBe(12);
    expect(res.body.data.isAvailable).toBe(true);
  });

  it('Scenario 18: PATCH /stock with 0 -> 200, isAvailable: false', async () => {
    const res = await request(app)
      .patch(`/api/v1/seller/products/${createdProductId}/stock`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stock: 0 });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(0);
    expect(res.body.data.isAvailable).toBe(false);

    // Verify public catalog shows isAvailable = false
    const pubRes = await request(app).get(`/api/v1/products/${createdProductId}`);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.isAvailable).toBe(false);
  });

  it('Scenario 19: PATCH /stock negative/fractional/string -> 400', async () => {
    const resNeg = await request(app)
      .patch(`/api/v1/seller/products/${createdProductId}/stock`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stock: -5 });
    expect(resNeg.status).toBe(400);

    const resFrac = await request(app)
      .patch(`/api/v1/seller/products/${createdProductId}/stock`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stock: 3.5 });
    expect(resFrac.status).toBe(400);

    const resStr = await request(app)
      .patch(`/api/v1/seller/products/${createdProductId}/stock`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stock: 'lima' });
    expect(resStr.status).toBe(400);
  });

  it('Scenario 20: PATCH /stock another seller product -> 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/seller/products/${productSeller2.id}/stock`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stock: 10 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Produk tidak ditemukan');
  });

  it('Scenario 21: DELETE own product -> 200, deletedAt set, row still exists in DB', async () => {
    const res = await request(app)
      .delete(`/api/v1/seller/products/${createdProductId}`)
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Produk berhasil dihapus');
    expect(res.body.data).toEqual({ id: createdProductId });

    // Verify row still exists in DB but has deletedAt
    const dbProduct = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(dbProduct).not.toBeNull();
    expect(dbProduct.deletedAt).not.toBeNull();
  });

  it('Scenario 22: DELETE twice or another seller product -> 404', async () => {
    const resTwice = await request(app)
      .delete(`/api/v1/seller/products/${createdProductId}`)
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resTwice.status).toBe(404);

    const resForeign = await request(app)
      .delete(`/api/v1/seller/products/${productSeller2.id}`)
      .set('Authorization', `Bearer ${seller1Token}`);
    expect(resForeign.status).toBe(404);
  });

  it('Scenario 23: Public catalog reflection after create/update/delete', async () => {
    // 1. Create a product
    const createRes = await request(app)
      .post('/api/v1/seller/products')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: `Sayur Kangkung Refl ${testRunId}`,
        price: 4000,
        unit: 'ikat',
        stock: 25,
      });
    const pid = createRes.body.data.id;

    // Check public list and detail
    const pubList = await request(app).get(`/api/v1/products?search=Kangkung+Refl+${testRunId}`);
    expect(pubList.status).toBe(200);
    expect(pubList.body.data.some((p) => p.id === pid)).toBe(true);

    const pubDetail = await request(app).get(`/api/v1/products/${pid}`);
    expect(pubDetail.status).toBe(200);
    expect(pubDetail.body.data.name).toBe(`Sayur Kangkung Refl ${testRunId}`);

    // 2. Update price
    await request(app)
      .put(`/api/v1/seller/products/${pid}`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        name: `Sayur Kangkung Refl ${testRunId}`,
        price: 5500,
        unit: 'ikat',
        stock: 25,
      });

    const pubDetailUpdated = await request(app).get(`/api/v1/products/${pid}`);
    expect(pubDetailUpdated.body.data.price).toBe(5500);

    // 3. Delete
    await request(app)
      .delete(`/api/v1/seller/products/${pid}`)
      .set('Authorization', `Bearer ${seller1Token}`);

    // Check public detail returns 404
    const pubDetailDeleted = await request(app).get(`/api/v1/products/${pid}`);
    expect(pubDetailDeleted.status).toBe(404);

    // Check public list does not contain pid
    const pubListAfterDelete = await request(app).get(`/api/v1/products?search=Kangkung+Refl+${testRunId}`);
    expect(pubListAfterDelete.body.data.some((p) => p.id === pid)).toBe(false);
  });

  it('Scenario 24: Response safety -> No seller email, phone, password hash, or internal deletion fields', async () => {
    const res = await request(app)
      .get(`/api/v1/seller/products/${productSeller1.id}`)
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('sellerId');
    expect(res.body.data).not.toHaveProperty('deletedAt');
    expect(res.body.data).not.toHaveProperty('email');
    expect(res.body.data).not.toHaveProperty('noTelepon');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('Scenario 25: Regression -> Auth, farmer-profile, marketplace, and cart routes are functional', async () => {
    const authRes = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@mail.com',
      password: 'wrongpassword',
    });
    expect(authRes.status).toBe(401);

    const mktRes = await request(app).get('/api/v1/products');
    expect(mktRes.status).toBe(200);

    const farmerRes = await request(app).get(`/api/v1/farmers/${seller1.id}`);
    expect(farmerRes.status).toBe(200);

    const cartRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(cartRes.status).toBe(200);
  });
});
