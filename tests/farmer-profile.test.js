import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const sellerWithProfileEmail = `seller.prof.${testRunId}@mail.com`;
const sellerNoProfileEmail = `seller.noprof.${testRunId}@mail.com`;
const buyerEmail = `buyer.prof.${testRunId}@mail.com`;

let sellerWithProfile;
let sellerNoProfile;
let buyer;
let sellerNoProfileToken;
let buyerToken;

let activeProduct1;
let activeProduct2;
let deletedProduct;

describe('Module 3: Farmer Profile (UC-07, UC-08)', () => {
  beforeAll(async () => {
    sellerWithProfile = await prisma.user.create({
      data: {
        nama: 'Petani Budi Sukses',
        email: sellerWithProfileEmail,
        noTelepon: '081233330001',
        passwordHash: 'dummyhash',
        role: 'SELLER',
        farmerProfile: {
          create: {
            namaUsaha: 'Kebun Berkah Tani',
            deskripsi: 'Menghasilkan sayuran organik segar dan sehat langsung dari pegunungan.',
            lokasi: 'Lembang, Bandung Barat',
            foto: 'https://example.com/kebun.jpg',
          },
        },
      },
    });

    sellerNoProfile = await prisma.user.create({
      data: {
        nama: 'Petani Baru Mulai',
        email: sellerNoProfileEmail,
        noTelepon: '081233330002',
        passwordHash: 'dummyhash',
        role: 'SELLER',
      },
    });

    buyer = await prisma.user.create({
      data: {
        nama: 'Pembeli Tani',
        email: buyerEmail,
        noTelepon: '081233330003',
        passwordHash: 'dummyhash',
        role: 'BUYER',
      },
    });

    sellerNoProfileToken = jwt.sign(
      { sub: sellerNoProfile.id, role: 'SELLER' },
      env.JWT_SECRET,
      { expiresIn: '1d' },
    );

    buyerToken = jwt.sign(
      { sub: buyer.id, role: 'BUYER' },
      env.JWT_SECRET,
      { expiresIn: '1d' },
    );

    activeProduct1 = await prisma.product.create({
      data: {
        sellerId: sellerWithProfile.id,
        nama: `Tomat Segar ${testRunId}`,
        harga: 15000,
        stok: 20,
        satuan: 'kg',
        deskripsi: 'Tomat pilihan kualitas super',
        createdAt: new Date(Date.now() - 2000),
      },
    });

    activeProduct2 = await prisma.product.create({
      data: {
        sellerId: sellerWithProfile.id,
        nama: `Cabai Rawit ${testRunId}`,
        harga: 35000,
        stok: 10,
        satuan: 'kg',
        deskripsi: 'Cabai rawit segar pedas',
        createdAt: new Date(Date.now() - 1000),
      },
    });

    deletedProduct = await prisma.product.create({
      data: {
        sellerId: sellerWithProfile.id,
        nama: `Bayam Dihapus ${testRunId}`,
        harga: 5000,
        stok: 0,
        satuan: 'ikat',
        deskripsi: 'Bayam sudah tidak aktif',
        deletedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    const userIds = [sellerWithProfile.id, sellerNoProfile.id, buyer.id];
    await prisma.product.deleteMany({ where: { sellerId: { in: userIds } } });
    await prisma.farmerProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('Scenario 1: GET /farmers/:id valid with profile -> 200, complete fields, only active products newest first', async () => {
    const res = await request(app).get(`/api/v1/farmers/${sellerWithProfile.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Berhasil');
    expect(res.body.data).toMatchObject({
      id: sellerWithProfile.id,
      name: 'Petani Budi Sukses',
      farmName: 'Kebun Berkah Tani',
      description: 'Menghasilkan sayuran organik segar dan sehat langsung dari pegunungan.',
      location: 'Lembang, Bandung Barat',
      photoUrl: 'https://example.com/kebun.jpg',
    });

    expect(Array.isArray(res.body.data.products)).toBe(true);
    const productIds = res.body.data.products.map((p) => p.id);
    expect(productIds).toContain(activeProduct1.id);
    expect(productIds).toContain(activeProduct2.id);
    expect(productIds).not.toContain(deletedProduct.id);

    // Sorted newest first
    const p1Index = productIds.indexOf(activeProduct1.id);
    const p2Index = productIds.indexOf(activeProduct2.id);
    expect(p2Index).toBeLessThan(p1Index);

    // Product item format & seller display name using namaUsaha
    const firstProduct = res.body.data.products[0];
    expect(firstProduct).not.toHaveProperty('description');
    expect(firstProduct.seller).toEqual({
      id: sellerWithProfile.id,
      name: 'Kebun Berkah Tani',
    });
  });

  it('Scenario 2: GET /farmers/:id seller without profile (UC-07 A1) -> 200, profile fields null, name & products present', async () => {
    const res = await request(app).get(`/api/v1/farmers/${sellerNoProfile.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      id: sellerNoProfile.id,
      name: 'Petani Baru Mulai',
      farmName: null,
      description: null,
      location: null,
      photoUrl: null,
      products: [],
    });
  });

  it('Scenario 3: GET /farmers/:id unknown seller ID -> 404 "Petani tidak ditemukan"', async () => {
    const res = await request(app).get('/api/v1/farmers/99999999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Petani tidak ditemukan');
  });

  it('Scenario 4: GET /farmers/:id ID of a BUYER -> 404 "Petani tidak ditemukan"', async () => {
    const res = await request(app).get(`/api/v1/farmers/${buyer.id}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Petani tidak ditemukan');
  });

  it('Scenario 5: GET /farmers/abc / 0 / -1 -> 400 with errors[]', async () => {
    for (const invalidId of ['abc', '0', '-5']) {
      const res = await request(app).get(`/api/v1/farmers/${invalidId}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe('id');
    }
  });

  it('Scenario 6: GET /seller/farmer-profile without token -> 401', async () => {
    const res = await request(app).get('/api/v1/seller/farmer-profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 7: GET /seller/farmer-profile with BUYER token -> 403', async () => {
    const res = await request(app)
      .get('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Scenario 8: GET /seller/farmer-profile seller has no profile -> 200 data null', async () => {
    const res = await request(app)
      .get('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${sellerNoProfileToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  it('Scenario 9: PUT /seller/farmer-profile initial create -> 200, row created, subsequent GET returns it', async () => {
    const createPayload = {
      farmName: 'Ladang Hijau Makmur',
      description: 'Pertanian terpadu ramah lingkungan dari dataran tinggi.',
      location: 'Ciwidey, Kab. Bandung',
      photoUrl: 'https://example.com/ladang.jpg',
    };

    const putRes = await request(app)
      .put('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${sellerNoProfileToken}`)
      .send(createPayload);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.message).toBe('Profil petani berhasil disimpan');
    expect(putRes.body.data).toEqual(createPayload);

    // Verify row exists in DB
    const dbProfile = await prisma.farmerProfile.findUnique({
      where: { userId: sellerNoProfile.id },
    });
    expect(dbProfile).not.toBeNull();
    expect(dbProfile.namaUsaha).toBe(createPayload.farmName);

    // Verify subsequent GET
    const getRes = await request(app)
      .get('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${sellerNoProfileToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toEqual(createPayload);
  });

  it('Scenario 10: PUT /seller/farmer-profile subsequent update -> 200, row updated, exactly 1 row in DB', async () => {
    const updatePayload = {
      farmName: 'Ladang Hijau Makmur Sejahtera',
      description: 'Menyediakan rempah dan sayuran organik pilihan keluarga.',
      location: 'Pangalengan, Kab. Bandung',
      photoUrl: 'https://example.com/ladang-baru.jpg',
    };

    const putRes = await request(app)
      .put('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${sellerNoProfileToken}`)
      .send(updatePayload);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data).toEqual(updatePayload);

    // Count rows for this user in DB
    const count = await prisma.farmerProfile.count({
      where: { userId: sellerNoProfile.id },
    });
    expect(count).toBe(1);
  });

  it('Scenario 11: PUT /seller/farmer-profile invalid body -> 400 with errors[]', async () => {
    const res = await request(app)
      .put('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${sellerNoProfileToken}`)
      .send({
        farmName: 'A', // too short
        description: 'Pendek', // too short (< 10)
        location: '', // empty
        photoUrl: 'not-a-valid-url',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('farmName');
    expect(fields).toContain('description');
    expect(fields).toContain('location');
    expect(fields).toContain('photoUrl');
  });

  it('Scenario 12: PUT /seller/farmer-profile as BUYER -> 403; without token -> 401', async () => {
    const validBody = {
      farmName: 'Kebun Test',
      description: 'Deskripsi kebun yang valid dan panjang.',
      location: 'Bandung',
    };

    const buyerRes = await request(app)
      .put('/api/v1/seller/farmer-profile')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(validBody);
    expect(buyerRes.status).toBe(403);

    const noTokenRes = await request(app)
      .put('/api/v1/seller/farmer-profile')
      .send(validBody);
    expect(noTokenRes.status).toBe(401);
  });

  it('Scenario 13: Marketplace integration: product seller.name uses namaUsaha when profile exists, fallback to users.nama', async () => {
    // 1. Seller with profile -> seller.name should be namaUsaha
    const res1 = await request(app).get(`/api/v1/products/${activeProduct1.id}`);
    expect(res1.status).toBe(200);
    expect(res1.body.data.seller).toEqual({
      id: sellerWithProfile.id,
      name: 'Kebun Berkah Tani',
    });

    // 2. Create product for seller without profile (temporarily delete seller profile to test fallback)
    const tempSeller = await prisma.user.create({
      data: {
        nama: 'Pak Mandra Tani',
        email: `mandra.${testRunId}@mail.com`,
        noTelepon: '081233330099',
        passwordHash: 'dummy',
        role: 'SELLER',
      },
    });

    const tempProduct = await prisma.product.create({
      data: {
        sellerId: tempSeller.id,
        nama: `Kangkung ${testRunId}`,
        harga: 4000,
        stok: 30,
        satuan: 'ikat',
        deskripsi: 'Kangkung hidroponik',
      },
    });

    const res2 = await request(app).get(`/api/v1/products/${tempProduct.id}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.seller).toEqual({
      id: tempSeller.id,
      name: 'Pak Mandra Tani',
    });

    // Clean up temporary seller & product
    await prisma.product.delete({ where: { id: tempProduct.id } });
    await prisma.user.delete({ where: { id: tempSeller.id } });
  });

  it('Scenario 14: Idempotent seed profile execution does not duplicate users, products, or profiles', async () => {
    const seedEmails = ['petani.budi@seed.local', 'petani.siti@seed.local', 'pembeli.andi@seed.local'];
    const count = async () => ({
      users: await prisma.user.count({ where: { email: { in: seedEmails } } }),
      profiles: await prisma.farmerProfile.count({
        where: { user: { email: { in: seedEmails } } },
      }),
      products: await prisma.product.count({
        where: { seller: { email: { in: seedEmails } } },
      }),
    });

    const { execFileSync } = await import('node:child_process');
    const runSeed = () => execFileSync(process.execPath, ['prisma/seed.js'], { stdio: 'pipe' });

    runSeed();
    const first = await count();
    runSeed();
    const second = await count();

    expect(first.users).toBe(3);
    expect(first.profiles).toBe(2);
    expect(first.products).toBeGreaterThanOrEqual(12);
    expect(second).toEqual(first);
  });
});

