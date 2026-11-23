import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { FLAT_SHIPPING_FEE_PER_SELLER } from '../src/shared/constants/order.js';

const testRunId = Date.now();
const seller1Email = `seller1.order.${testRunId}@mail.com`;
const seller2Email = `seller2.order.${testRunId}@mail.com`;
const buyerEmail = `buyer.order.${testRunId}@mail.com`;
const buyerEmptyCartEmail = `buyer.empty.${testRunId}@mail.com`;

let seller1;
let seller2;
let buyer;
let buyerEmptyCart;

let seller1Token;
let buyerToken;
let buyerEmptyCartToken;

let product1Seller1;
let product2Seller1;
let product1Seller2;
let productLowStock;
let productDeleted;

describe('Module: Order Checkout (UC-10)', () => {
  beforeAll(async () => {
    seller1 = await prisma.user.create({
      data: {
        nama: 'Petani Satu Checkout',
        email: seller1Email,
        noTelepon: '081211110001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Tani Makmur Sejahtera',
            deskripsi: 'Petani sayuran segar organik',
            lokasi: 'Bandung',
          },
        },
      },
    });

    seller2 = await prisma.user.create({
      data: {
        nama: 'Petani Dua Checkout',
        email: seller2Email,
        noTelepon: '081211110002',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Buah Berkah',
            deskripsi: 'Petani buah-buahan lokal',
            lokasi: 'Lembang',
          },
        },
      },
    });

    buyer = await prisma.user.create({
      data: {
        nama: 'Pembeli Checkout Test',
        email: buyerEmail,
        noTelepon: '081211110003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    buyerEmptyCart = await prisma.user.create({
      data: {
        nama: 'Pembeli Keranjang Kosong',
        email: buyerEmptyCartEmail,
        noTelepon: '081211110004',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    seller1Token = jwt.sign({ sub: seller1.id, role: 'SELLER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyerToken = jwt.sign({ sub: buyer.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });
    buyerEmptyCartToken = jwt.sign({ sub: buyerEmptyCart.id, role: 'BUYER' }, env.JWT_SECRET, { expiresIn: '1d' });

    product1Seller1 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Wortel Manis ${testRunId}`,
        harga: 15000,
        stok: 50,
        satuan: 'kg',
        deskripsi: 'Wortel segar dipanen pagi hari',
      },
    });

    product2Seller1 = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Bayam Hijau ${testRunId}`,
        harga: 8000,
        stok: 30,
        satuan: 'ikat',
        deskripsi: 'Bayam segar tanpa pestisida',
      },
    });

    product1Seller2 = await prisma.product.create({
      data: {
        sellerId: seller2.id,
        nama: `Apel Malang ${testRunId}`,
        harga: 30000,
        stok: 40,
        satuan: 'kg',
        deskripsi: 'Apel malang manis dan renyah',
      },
    });

    productLowStock = await prisma.product.create({
      data: {
        sellerId: seller1.id,
        nama: `Kaviar Tani Langka ${testRunId}`,
        harga: 100000,
        stok: 2,
        satuan: 'pack',
        deskripsi: 'Stok sangat terbatas',
      },
    });

    productDeleted = await prisma.product.create({
      data: {
        sellerId: seller2.id,
        nama: `Stroberi Musiman ${testRunId}`,
        harga: 25000,
        stok: 20,
        satuan: 'kg',
        deskripsi: 'Stroberi yang sudah tidak dijual',
        deletedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    const userIds = [seller1?.id, seller2?.id, buyer?.id, buyerEmptyCart?.id].filter(Boolean);
    if (userIds.length > 0) {
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
    await prisma.$disconnect();
  });

  it('Scenario 1: POST /orders/checkout without token -> 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .send({
        namaPenerima: 'Budi Santoso',
        noTelepon: '081234567890',
        alamatPengiriman: 'Jl. Merdeka No. 123, Bandung',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 2: POST /orders/checkout with SELLER token -> 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        namaPenerima: 'Budi Santoso',
        noTelepon: '081234567890',
        alamatPengiriman: 'Jl. Merdeka No. 123, Bandung',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 3: POST /orders/checkout with invalid body -> 400 Bad Request with field errors', async () => {
    // Missing namaPenerima & alamatPengiriman too short
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        namaPenerima: 'Al', // min 3
        noTelepon: '123', // invalid phone
        alamatPengiriman: 'Pendek', // min 10
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e) => e.field === 'namaPenerima')).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'noTelepon')).toBe(true);
    expect(res.body.errors.some((e) => e.field === 'alamatPengiriman')).toBe(true);
  });

  it('Scenario 4: POST /orders/checkout when cart is empty -> 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerEmptyCartToken}`)
      .send({
        namaPenerima: 'Pembeli Tanpa Keranjang',
        noTelepon: '081234567890',
        alamatPengiriman: 'Jl. Ahmad Yani No. 45, Bandung',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Keranjang belanja masih kosong');
  });

  it('Scenario 5: POST /orders/checkout when product stock is insufficient -> 400 Bad Request mentioning product name', async () => {
    // Put product with low stock (stok = 2) into buyer's cart with quantity 5
    const cart = await prisma.cart.upsert({
      where: { buyerId: buyer.id },
      update: {},
      create: { buyerId: buyer.id },
    });

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productLowStock.id,
        },
      },
      update: { jumlah: 5, subtotal: 500000 },
      create: {
        cartId: cart.id,
        productId: productLowStock.id,
        jumlah: 5,
        subtotal: 500000,
      },
    });

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        namaPenerima: 'Pembeli Uji Stok',
        noTelepon: '081234567890',
        alamatPengiriman: 'Jl. Riau No. 100, Kota Bandung',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain(productLowStock.nama);

    // Clean up low stock item from cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  });

  it('Scenario 6: POST /orders/checkout when product is soft-deleted -> 400 Bad Request', async () => {
    const cart = await prisma.cart.findUnique({ where: { buyerId: buyer.id } });

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: productDeleted.id,
        jumlah: 1,
        subtotal: 25000,
      },
    });

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        namaPenerima: 'Pembeli Uji Soft Delete',
        noTelepon: '081234567890',
        alamatPengiriman: 'Jl. Buah Batu No. 10, Bandung',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('tidak tersedia');

    // Clean up deleted product item from cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  });

  it('Scenario 7: Single-seller checkout success -> 201 Created with flat shipping, DB snapshot, payment record', async () => {
    const cart = await prisma.cart.findUnique({ where: { buyerId: buyer.id } });

    // Add 2 kg of product1Seller1 (15000 * 2 = 30000)
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product1Seller1.id,
        jumlah: 2,
        subtotal: 30000,
      },
    });

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        namaPenerima: 'Siti Aminah',
        noTelepon: '081298765432',
        alamatPengiriman: 'Komplek Pertanian Indah No. 5, Bandung Timur',
        catatan: 'Tolong kemas rapat dengan kardus',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data.paymentId).toBeDefined();
    expect(data.orders).toHaveLength(1);

    const order = data.orders[0];
    const expectedSubtotal = 15000 * 2;
    const expectedTotal = expectedSubtotal + FLAT_SHIPPING_FEE_PER_SELLER;

    expect(order.sellerId).toBe(seller1.id);
    expect(order.seller.name).toBe('Tani Makmur Sejahtera');
    expect(order.status).toBe('MENUNGGU_PEMBAYARAN');
    expect(order.ongkir).toBe(FLAT_SHIPPING_FEE_PER_SELLER);
    expect(order.totalHarga).toBe(expectedTotal);
    expect(order.namaPenerima).toBe('Siti Aminah');
    expect(order.catatan).toBe('Tolong kemas rapat dengan kardus');
    expect(order.nomorOrder).toMatch(/^ORD-\d+-\d+-[A-Z0-9]+$/);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].productId).toBe(product1Seller1.id);
    expect(order.items[0].jumlah).toBe(2);
    expect(order.items[0].hargaSatuan).toBe(15000);
    expect(order.items[0].subtotal).toBe(expectedSubtotal);
    expect(data.grandTotal).toBe(expectedTotal);

    // Verify Payment in database
    const dbPayment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: { orders: true },
    });
    expect(dbPayment).not.toBeNull();
    expect(Number(dbPayment.jumlah)).toBe(expectedTotal);
    expect(dbPayment.status).toBe('PENDING');
    expect(dbPayment.orders).toHaveLength(1);
    expect(dbPayment.orders[0].id).toBe(order.id);

    // Verify OrderStatusHistory in database
    const dbHistory = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
    });
    expect(dbHistory).toHaveLength(1);
    expect(dbHistory[0].status).toBe('MENUNGGU_PEMBAYARAN');

    // Verify product stock was NOT deducted during checkout
    const checkProduct = await prisma.product.findUnique({
      where: { id: product1Seller1.id },
    });
    expect(checkProduct.stok).toBe(50);

    // Clean up cart for next test
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  });

  it('Scenario 8: Multi-seller cart splitting -> Creates separate orders per seller with flat shipping each', async () => {
    const cart = await prisma.cart.findUnique({ where: { buyerId: buyer.id } });
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Seller 1 items:
    // product1Seller1: 3 x 15000 = 45000
    // product2Seller1: 2 x 8000 = 16000
    // Seller 1 subtotal: 61000 + 10000 ongkir = 71000
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product1Seller1.id,
        jumlah: 3,
        subtotal: 45000,
      },
    });

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product2Seller1.id,
        jumlah: 2,
        subtotal: 16000,
      },
    });

    // Seller 2 item:
    // product1Seller2: 2 x 30000 = 60000
    // Seller 2 subtotal: 60000 + 10000 ongkir = 70000
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product1Seller2.id,
        jumlah: 2,
        subtotal: 60000,
      },
    });

    const res = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        namaPenerima: 'Dewi Lestari',
        noTelepon: '081345678901',
        alamatPengiriman: 'Jl. Dago Asri No. 88, Coblong, Bandung',
        catatan: 'Kirim saat jam kerja kantor',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const { data } = res.body;
    expect(data.orders).toHaveLength(2);

    const orderSeller1 = data.orders.find((o) => o.sellerId === seller1.id);
    const orderSeller2 = data.orders.find((o) => o.sellerId === seller2.id);

    expect(orderSeller1).toBeDefined();
    expect(orderSeller2).toBeDefined();

    // Seller 1 order checks
    expect(orderSeller1.ongkir).toBe(FLAT_SHIPPING_FEE_PER_SELLER);
    expect(orderSeller1.items).toHaveLength(2);
    expect(orderSeller1.itemsSubtotal).toBe(61000);
    expect(orderSeller1.totalHarga).toBe(71000);
    expect(orderSeller1.seller.name).toBe('Tani Makmur Sejahtera');

    // Seller 2 order checks
    expect(orderSeller2.ongkir).toBe(FLAT_SHIPPING_FEE_PER_SELLER);
    expect(orderSeller2.items).toHaveLength(1);
    expect(orderSeller2.itemsSubtotal).toBe(60000);
    expect(orderSeller2.totalHarga).toBe(70000);
    expect(orderSeller2.seller.name).toBe('Kebun Buah Berkah');

    // Unique order numbers
    expect(orderSeller1.nomorOrder).not.toBe(orderSeller2.nomorOrder);
    expect(orderSeller1.nomorOrder).toMatch(/^ORD-\d+-\d+-[A-Z0-9]+$/);
    expect(orderSeller2.nomorOrder).toMatch(/^ORD-\d+-\d+-[A-Z0-9]+$/);

    // Grand total: 71000 + 70000 = 141000
    const expectedGrandTotal = 71000 + 70000;
    expect(data.grandTotal).toBe(expectedGrandTotal);
    expect(data.summary.totalOrders).toBe(2);
    expect(data.summary.totalOngkir).toBe(20000);
    expect(data.summary.itemsSubtotal).toBe(121000);
    expect(data.summary.grandTotal).toBe(expectedGrandTotal);

    // Single payment record linked to both orders
    expect(data.paymentId).toBeDefined();
    expect(orderSeller1.paymentId).toBe(data.paymentId);
    expect(orderSeller2.paymentId).toBe(data.paymentId);

    const dbPayment = await prisma.payment.findUnique({
      where: { id: data.paymentId },
      include: { orders: true },
    });
    expect(dbPayment).not.toBeNull();
    expect(Number(dbPayment.jumlah)).toBe(expectedGrandTotal);
    expect(dbPayment.orders).toHaveLength(2);

    // Verify stock was NOT deducted yet
    const p1 = await prisma.product.findUnique({ where: { id: product1Seller1.id } });
    const p2 = await prisma.product.findUnique({ where: { id: product2Seller1.id } });
    const p3 = await prisma.product.findUnique({ where: { id: product1Seller2.id } });
    expect(p1.stok).toBe(50);
    expect(p2.stok).toBe(30);
    expect(p3.stok).toBe(40);
  });
});
