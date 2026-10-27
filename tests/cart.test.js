import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const sellerEmail = `seller.cart.${testRunId}@mail.com`;
const buyer1Email = `buyer1.cart.${testRunId}@mail.com`;
const buyer2Email = `buyer2.cart.${testRunId}@mail.com`;
const buyerNewEmail = `buyer.new.cart.${testRunId}@mail.com`;

let seller;
let buyer1;
let buyer2;
let buyerNew;

let sellerToken;
let buyer1Token;
let buyer2Token;
let buyerNewToken;

let product1;
let product2;
let productZeroStock;
let productDeleted;

describe('Module 4: Shopping Cart (UC-09)', () => {
  beforeAll(async () => {
    seller = await prisma.user.create({
      data: {
        nama: 'Petani Cart Test',
        email: sellerEmail,
        noTelepon: '081299990001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Cart Organik',
            deskripsi: 'Kebun sayur organik segar untuk pengujian keranjang.',
            lokasi: 'Lembang, Bandung',
            foto: 'https://example.com/kebun-cart.jpg',
          },
        },
      },
    });

    buyer1 = await prisma.user.create({
      data: {
        nama: 'Pembeli Cart 1',
        email: buyer1Email,
        noTelepon: '081299990002',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyer2 = await prisma.user.create({
      data: {
        nama: 'Pembeli Cart 2',
        email: buyer2Email,
        noTelepon: '081299990003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyerNew = await prisma.user.create({
      data: {
        nama: 'Pembeli Baru Cart',
        email: buyerNewEmail,
        noTelepon: '081299990004',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    sellerToken = jwt.sign({ sub: seller.id, role: 'SELLER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyer1Token = jwt.sign({ sub: buyer1.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyer2Token = jwt.sign({ sub: buyer2.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyerNewToken = jwt.sign({ sub: buyerNew.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });

    product1 = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: `Cabai Merah Cart ${testRunId}`,
        harga: 45000,
        stok: 25,
        satuan: 'kg',
        deskripsi: 'Cabai merah kualitas prima',
        gambarUrl: 'https://example.com/cabai.jpg',
      },
    });

    product2 = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: `Tomat Segar Cart ${testRunId}`,
        harga: 15000,
        stok: 10,
        satuan: 'kg',
        deskripsi: 'Tomat merah segar',
        gambarUrl: 'https://example.com/tomat.jpg',
      },
    });

    productZeroStock = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: `Bayam Habis Cart ${testRunId}`,
        harga: 5000,
        stok: 0,
        satuan: 'ikat',
        deskripsi: 'Bayam sedang kosong',
      },
    });

    productDeleted = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: `Wortel Dihapus Cart ${testRunId}`,
        harga: 12000,
        stok: 15,
        satuan: 'kg',
        deskripsi: 'Wortel soft deleted',
        deletedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    const userIds = [seller?.id, buyer1?.id, buyer2?.id, buyerNew?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.cartItem.deleteMany({ where: { cart: { buyerId: { in: userIds } } } });
      await prisma.cart.deleteMany({ where: { buyerId: { in: userIds } } });
      await prisma.product.deleteMany({ where: { sellerId: { in: userIds } } });
      await prisma.farmerProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it('Scenario 1: GET /cart without a token -> 401', async () => {
    const res = await request(app).get('/api/v1/cart');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 2: GET /cart with a SELLER token -> 403', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 3: GET /cart for a new buyer -> 200, id: null, items: [], zero totals, no cart row created', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyerNewToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      id: null,
      items: [],
      itemCount: 0,
      totalItems: 0,
      totalPrice: 0,
    });

    const dbCart = await prisma.cart.findUnique({ where: { buyerId: buyerNew.id } });
    expect(dbCart).toBeNull();
  });

  let createdItemId;

  it('Scenario 4: POST /cart/items first item -> 201, cart and item persisted, correct subtotal and total', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Produk berhasil ditambahkan ke keranjang');
    expect(res.body.data.itemCount).toBe(1);
    expect(res.body.data.totalItems).toBe(2);
    expect(res.body.data.totalPrice).toBe(90000);

    const item = res.body.data.items[0];
    createdItemId = item.id;
    expect(item.productId).toBe(product1.id);
    expect(item.name).toBe(product1.nama);
    expect(item.price).toBe(45000);
    expect(item.quantity).toBe(2);
    expect(item.subtotal).toBe(90000);
    expect(item.isAvailable).toBe(true);
    expect(item.seller).toEqual({
      id: seller.id,
      name: 'Kebun Cart Organik',
    });
  });

  it('Scenario 5: POST /cart/items same product (A2) -> 201, one row, quantity increased', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].id).toBe(createdItemId);
    expect(res.body.data.items[0].quantity).toBe(5);
    expect(res.body.data.items[0].subtotal).toBe(225000);
    expect(res.body.data.totalItems).toBe(5);
    expect(res.body.data.totalPrice).toBe(225000);
  });

  it('Scenario 6: POST /cart/items exceeding stock (A1) -> 400 "Stok tidak mencukupi", cart unchanged', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: 21 }); // 5 existing + 21 = 26 > 25 stock

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Stok tidak mencukupi');
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'quantity' })]),
    );

    const getRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer1Token}`);
    expect(getRes.body.data.items[0].quantity).toBe(5);
  });

  it('Scenario 7: POST /cart/items zero-stock product -> 400 "Stok tidak mencukupi"', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: productZeroStock.id, quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Stok tidak mencukupi');
  });

  it('Scenario 8: POST /cart/items missing or soft-deleted product -> 404 "Produk tidak ditemukan"', async () => {
    const resDeleted = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: productDeleted.id, quantity: 1 });

    expect(resDeleted.status).toBe(404);
    expect(resDeleted.body.message).toBe('Produk tidak ditemukan');

    const resMissing = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: 999999, quantity: 1 });

    expect(resMissing.status).toBe(404);
    expect(resMissing.body.message).toBe('Produk tidak ditemukan');
  });

  it('Scenario 9: POST /cart/items invalid body -> 400 with errors[].field', async () => {
    const res1 = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: 0, quantity: 1 });

    expect(res1.status).toBe(400);
    expect(res1.body.errors.some((e) => e.field === 'productId')).toBe(true);

    const res2 = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: 0 });

    expect(res2.status).toBe(400);
    expect(res2.body.errors.some((e) => e.field === 'quantity')).toBe(true);

    const res3 = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: -5 });

    expect(res3.status).toBe(400);

    const res4 = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: 'tiga' });

    expect(res4.status).toBe(400);
  });

  it('Scenario 10: PATCH /cart/items/:id valid quantity -> 200, subtotal and total recalculated', async () => {
    const res = await request(app)
      .patch(`/api/v1/cart/items/${createdItemId}`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ quantity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Keranjang berhasil diperbarui');
    expect(res.body.data.items[0].quantity).toBe(4);
    expect(res.body.data.items[0].subtotal).toBe(180000);
    expect(res.body.data.totalPrice).toBe(180000);
  });

  it('Scenario 11: PATCH /cart/items/:id exceeding stock -> 400, old quantity preserved', async () => {
    const res = await request(app)
      .patch(`/api/v1/cart/items/${createdItemId}`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ quantity: 26 }); // product1 stock is 25

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Stok tidak mencukupi');

    const getRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer1Token}`);
    expect(getRes.body.data.items[0].quantity).toBe(4);
  });

  it('Scenario 12: PATCH /cart/items/:id another buyer\'s item -> 404', async () => {
    const res = await request(app)
      .patch(`/api/v1/cart/items/${createdItemId}`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item keranjang tidak ditemukan');
  });

  it('Scenario 13: PATCH /cart/items/:id missing item -> 404', async () => {
    const res = await request(app)
      .patch('/api/v1/cart/items/999999')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item keranjang tidak ditemukan');
  });

  it('Scenario 14: DELETE /cart/items/:id -> 200, item removed, total recalculated', async () => {
    // Add second item first
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product2.id, quantity: 2 });

    const deleteRes = await request(app)
      .delete(`/api/v1/cart/items/${createdItemId}`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.message).toBe('Produk berhasil dihapus dari keranjang');
    expect(deleteRes.body.data.items.length).toBe(1);
    expect(deleteRes.body.data.items[0].productId).toBe(product2.id);
    expect(deleteRes.body.data.totalPrice).toBe(30000);
  });

  it('Scenario 15: DELETE /cart/items/:id another buyer\'s item -> 404', async () => {
    // Add item to buyer1's cart
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({ productId: product1.id, quantity: 1 });

    const itemId = addRes.body.data.items.find((i) => i.productId === product1.id).id;

    const res = await request(app)
      .delete(`/api/v1/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Item keranjang tidak ditemukan');
  });

  it('Scenario 16: GET /cart for buyer A -> Returns buyer A\'s items only', async () => {
    // Add item for buyer 2
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ productId: product1.id, quantity: 5 });

    const resBuyer1 = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer1Token}`);

    const resBuyer2 = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect(resBuyer1.status).toBe(200);
    expect(resBuyer2.status).toBe(200);
    expect(resBuyer1.body.data.id).not.toBe(resBuyer2.body.data.id);
    expect(resBuyer2.body.data.items.length).toBe(1);
    expect(resBuyer2.body.data.items[0].quantity).toBe(5);
  });

  it('Scenario 17: Item response -> price/subtotal are numbers; no email, phone, password hash, or deletedAt', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(typeof item.price).toBe('number');
    expect(typeof item.subtotal).toBe('number');
    expect(item).not.toHaveProperty('deletedAt');
    expect(item.seller).not.toHaveProperty('email');
    expect(item.seller).not.toHaveProperty('noTelepon');
    expect(item.seller).not.toHaveProperty('passwordHash');
  });

  it('Scenario 18: Stock drops after item added -> GET shows isAvailable: false; PATCH returns 400', async () => {
    // Add item with quantity 2 of product2 (stock is 10)
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ productId: product2.id, quantity: 2 });

    const item = addRes.body.data.items.find((i) => i.productId === product2.id);

    // Drop stock to 1
    await prisma.product.update({
      where: { id: product2.id },
      data: { stok: 1 },
    });

    const getRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer2Token}`);

    const updatedItem = getRes.body.data.items.find((i) => i.id === item.id);
    expect(updatedItem.isAvailable).toBe(false);
    expect(updatedItem.stock).toBe(1);

    const patchRes = await request(app)
      .patch(`/api/v1/cart/items/${item.id}`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ quantity: 2 }); // 2 > 1

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.message).toBe('Stok tidak mencukupi');

    // Restore stock
    await prisma.product.update({
      where: { id: product2.id },
      data: { stok: 10 },
    });
  });

  it('Scenario 19: Product soft-deleted after item added -> isAvailable: false; PATCH returns 400; DELETE returns 200', async () => {
    // Add product to buyer2
    const tempProduct = await prisma.product.create({
      data: {
        sellerId: seller.id,
        nama: `Produk Temp Deleted ${testRunId}`,
        harga: 20000,
        stok: 10,
        satuan: 'kg',
      },
    });

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ productId: tempProduct.id, quantity: 2 });

    const item = addRes.body.data.items.find((i) => i.productId === tempProduct.id);

    // Soft delete product
    await prisma.product.update({
      where: { id: tempProduct.id },
      data: { deletedAt: new Date() },
    });

    // Check GET
    const getRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer2Token}`);

    const itemInGet = getRes.body.data.items.find((i) => i.id === item.id);
    expect(itemInGet.isAvailable).toBe(false);

    // Check PATCH -> 400 "Produk tidak tersedia"
    const patchRes = await request(app)
      .patch(`/api/v1/cart/items/${item.id}`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ quantity: 3 });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.message).toBe('Produk tidak tersedia');

    // Check DELETE -> 200 allowed
    const deleteRes = await request(app)
      .delete(`/api/v1/cart/items/${item.id}`)
      .set('Authorization', `Bearer ${buyer2Token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.items.some((i) => i.id === item.id)).toBe(false);
  });

  it('Scenario 20: Multiple consecutive mutations -> totalPrice always equals sum of subtotals and stored DB values stay consistent', async () => {
    const cartRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${buyer1Token}`);

    const cartData = cartRes.body.data;
    const computedTotal = cartData.items.reduce((sum, item) => sum + item.subtotal, 0);
    expect(cartData.totalPrice).toBe(computedTotal);

    // Check DB carts table
    const dbCart = await prisma.cart.findUnique({
      where: { buyerId: buyer1.id },
    });
    expect(Number(dbCart.totalHarga)).toBe(cartData.totalPrice);
  });

  it('Scenario 21: Regression -> routes of existing modules are functional', async () => {
    const authRes = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@mail.com',
      password: 'wrongpassword',
    });
    expect(authRes.status).toBe(401);

    const mktRes = await request(app).get('/api/v1/products');
    expect(mktRes.status).toBe(200);

    const farmerRes = await request(app).get(`/api/v1/farmers/${seller.id}`);
    expect(farmerRes.status).toBe(200);
  });
});

