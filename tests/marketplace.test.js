import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';

const prefix = `MktTest${Date.now()}`;
const sellerEmail = `mkt.seller.${Date.now()}@mail.com`;
let seller;
const ids = {};

const baseProduct = (nama, extra = {}) => ({
  nama: `${prefix} ${nama}`,
  harga: 12345.5,
  stok: 10,
  satuan: 'kg',
  deskripsi: `Deskripsi ${nama}`,
  ...extra,
});

describe('Module 2: Marketplace (UC-04, UC-05, UC-06)', () => {
  beforeAll(async () => {
    seller = await prisma.user.create({
      data: {
        nama: 'Seller Marketplace Test',
        email: sellerEmail,
        noTelepon: '081200009999',
        passwordHash: 'not-a-real-hash',
        role: 'SELLER',
      },
    });

    const create = async (key, nama, extra) => {
      const product = await prisma.product.create({
        data: { ...baseProduct(nama, extra), sellerId: seller.id },
      });
      ids[key] = product.id;
      await new Promise((resolve) => setTimeout(resolve, 15));
    };

    await create('cabai', 'Cabai Merah');
    await create('tomat', 'Tomat');
    await create('habis', 'Bayam Habis', { stok: 0 });
    await create('rating', 'Wortel Rating', { ratingRataRata: 4.5, jumlahUlasan: 8 });
    await create('dihapus', 'Cabai Dihapus', { deletedAt: new Date() });
    await create('persen', '100% Organik');
    await create('garis', 'Kol_Hijau');
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { sellerId: seller.id } });
    await prisma.user.delete({ where: { id: seller.id } });
    await prisma.$disconnect();
  });

  const list = (query = {}) => request(app).get('/api/v1/products').query(query);

  it('Scenario 1: GET /products without token -> 200, active products, meta, newest first', async () => {
    const res = await list({ search: prefix, limit: 50 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 50, total: 6, totalPages: 1 });
    const returnedIds = res.body.data.map((p) => p.id);
    expect(returnedIds).toEqual([...returnedIds].sort((a, b) => b - a));
    expect(returnedIds[0]).toBe(ids.garis);
  });

  it('Scenario 2: soft-deleted product is hidden from list and detail', async () => {
    const res = await list({ search: prefix, limit: 50 });
    expect(res.body.data.map((p) => p.id)).not.toContain(ids.dihapus);

    const detail = await request(app).get(`/api/v1/products/${ids.dihapus}`);
    expect(detail.status).toBe(404);
  });

  it('Scenario 3: search is case-insensitive', async () => {
    const lower = await list({ search: `${prefix} cabai` });
    const upper = await list({ search: `${prefix} CABAI` });

    for (const res of [lower, upper]) {
      expect(res.status).toBe(200);
      expect(res.body.data.map((p) => p.id)).toEqual([ids.cabai]);
    }
  });

  it('Scenario 4: empty / whitespace search returns the whole catalog', async () => {
    const all = await list({});
    const empty = await list({ search: '' });
    const spaces = await list({ search: '   ' });

    expect(empty.status).toBe(200);
    expect(spaces.status).toBe(200);
    expect(empty.body.meta.total).toBe(all.body.meta.total);
    expect(spaces.body.meta.total).toBe(all.body.meta.total);
  });

  it('Scenario 5: search without results -> 200, data [], total 0', async () => {
    const res = await list({ search: `${prefix}-tidak-ada-xyz` });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.meta.totalPages).toBe(0);
  });

  it('Scenario 6: % and _ are treated as literal text', async () => {
    const all = await list({});
    const percent = await list({ search: '%' });
    const underscore = await list({ search: '_' });

    expect(percent.status).toBe(200);
    expect(percent.body.data.map((p) => p.id)).toEqual([ids.persen]);
    expect(percent.body.meta.total).toBeLessThan(all.body.meta.total);

    expect(underscore.status).toBe(200);
    expect(underscore.body.data.map((p) => p.id)).toEqual([ids.garis]);
  });

  it('Scenario 7: pagination page=2&limit=5 returns correct slice and meta', async () => {
    const full = await list({ search: prefix, limit: 50 });
    const page2 = await list({ search: prefix, page: 2, limit: 5 });

    expect(page2.status).toBe(200);
    expect(page2.body.meta).toEqual({ page: 2, limit: 5, total: 6, totalPages: 2 });
    expect(page2.body.data.map((p) => p.id)).toEqual(full.body.data.slice(5).map((p) => p.id));
  });

  it('Scenario 8: invalid page/limit -> 400 with errors[]', async () => {
    for (const query of [{ page: 0 }, { limit: 100 }, { limit: 'abc' }]) {
      const res = await list(query);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
      expect(res.body.errors[0]).toHaveProperty('field');
    }
  });

  it('Scenario 9: zero-stock product stays visible with isAvailable false', async () => {
    const res = await list({ search: `${prefix} Bayam Habis` });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: ids.habis, stock: 0, isAvailable: false });

    const detail = await request(app).get(`/api/v1/products/${ids.habis}`);
    expect(detail.body.data.isAvailable).toBe(false);
  });

  it('Scenario 10: list response exposes no description or sensitive fields', async () => {
    const res = await list({ search: prefix, limit: 50 });
    const serialized = JSON.stringify(res.body);

    for (const item of res.body.data) {
      expect(item).not.toHaveProperty('description');
      expect(item).not.toHaveProperty('deletedAt');
      expect(Object.keys(item.seller).sort()).toEqual(['id', 'name']);
    }
    expect(serialized).not.toContain(sellerEmail);
    expect(serialized).not.toContain('081200009999');
    expect(serialized).not.toContain('not-a-real-hash');
    expect(serialized).not.toMatch(/passwordHash|password_hash|noTelepon|deletedAt/);
  });

  it('Scenario 11: GET /products/:id -> 200 full fields, numeric price, reviews []', async () => {
    const res = await request(app).get(`/api/v1/products/${ids.rating}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: ids.rating,
      name: `${prefix} Wortel Rating`,
      description: 'Deskripsi Wortel Rating',
      price: 12345.5,
      unit: 'kg',
      stock: 10,
      isAvailable: true,
      imageUrl: null,
      avgRating: 4.5,
      reviewCount: 8,
      seller: { id: seller.id, name: 'Seller Marketplace Test' },
      reviews: [],
    });
    expect(typeof res.body.data.price).toBe('number');
    expect(typeof res.body.data.avgRating).toBe('number');
  });

  it('Scenario 12: unknown or deleted product -> 404', async () => {
    const unknown = await request(app).get('/api/v1/products/99999999');
    expect(unknown.status).toBe(404);
    expect(unknown.body.message).toBe('Produk tidak ditemukan');
  });

  it('Scenario 13: GET /products/abc -> 400', async () => {
    const res = await request(app).get('/api/v1/products/abc');
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('id');
  });

  it('Scenario 14: reviewCount 0 -> avgRating 0', async () => {
    const res = await request(app).get(`/api/v1/products/${ids.tomat}`);
    expect(res.body.data.reviewCount).toBe(0);
    expect(res.body.data.avgRating).toBe(0);
  });

  it('Scenario 15: seed run twice does not duplicate users or products', async () => {
    const seedEmails = ['petani.budi@seed.local', 'petani.siti@seed.local', 'pembeli.andi@seed.local'];
    const count = async () => ({
      users: await prisma.user.count({ where: { email: { in: seedEmails } } }),
      products: await prisma.product.count({ where: { seller: { email: { in: seedEmails } } } }),
    });

    const { execFileSync } = await import('node:child_process');
    const runSeed = () => execFileSync(process.execPath, ['prisma/seed.js'], { stdio: 'pipe' });

    runSeed();
    const first = await count();
    runSeed();
    const second = await count();

    expect(first.users).toBe(3);
    expect(first.products).toBeGreaterThanOrEqual(12);
    expect(second).toEqual(first);
  }, 60000);
});
