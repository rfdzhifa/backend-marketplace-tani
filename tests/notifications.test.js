import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const testRunId = Date.now();
const buyerEmail = `buyer.notif.${testRunId}@mail.com`;
const sellerEmail = `seller.notif.${testRunId}@mail.com`;

let buyer;
let seller;
let buyerToken;
let sellerToken;
let buyerNotifications = [];
let sellerNotifications = [];

describe('Module: In-App Notifications (Supporting)', () => {
  beforeAll(async () => {
    buyer = await prisma.user.create({
      data: {
        nama: 'Pembeli Notifikasi',
        email: buyerEmail,
        noTelepon: '081266660001',
        passwordHash: 'secret-hash-buyer',
        role: 'BUYER',
      },
    });

    seller = await prisma.user.create({
      data: {
        nama: 'Petani Notifikasi',
        email: sellerEmail,
        noTelepon: '081266660002',
        passwordHash: 'secret-hash-seller',
        role: 'SELLER',
      },
    });

    buyerToken = jwt.sign({ sub: buyer.id, role: buyer.role }, env.JWT_SECRET, { expiresIn: '1h' });
    sellerToken = jwt.sign({ sub: seller.id, role: seller.role }, env.JWT_SECRET, { expiresIn: '1h' });

    const baseTime = new Date('2026-11-24T01:00:00.000Z').getTime();

    const b1 = await prisma.notification.create({
      data: {
        userId: buyer.id,
        pesan: 'Pesanan #1 sedang diproses',
        isRead: false,
        createdAt: new Date(baseTime),
      },
    });
    const b2 = await prisma.notification.create({
      data: {
        userId: buyer.id,
        pesan: 'Pesanan #2 sudah dibayar',
        isRead: true,
        createdAt: new Date(baseTime + 1000),
      },
    });
    const b3 = await prisma.notification.create({
      data: {
        userId: buyer.id,
        pesan: 'Pesanan #3 telah dikirim',
        isRead: false,
        createdAt: new Date(baseTime + 2000),
      },
    });
    buyerNotifications = [b1, b2, b3];

    const s1 = await prisma.notification.create({
      data: {
        userId: seller.id,
        pesan: 'Pesanan masuk baru #10',
        isRead: false,
        createdAt: new Date(baseTime + 3000),
      },
    });
    const s2 = await prisma.notification.create({
      data: {
        userId: seller.id,
        pesan: 'Pesanan #11 dikonfirmasi selesai',
        isRead: false,
        createdAt: new Date(baseTime + 4000),
      },
    });
    sellerNotifications = [s1, s2];
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [buyer.id, seller.id] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [buyerEmail, sellerEmail] } },
    });
  });

  it('rejects unauthenticated requests with 401', async () => {
    const listRes = await request(app).get('/api/v1/notifications');
    expect(listRes.status).toBe(401);

    const readAllRes = await request(app).patch('/api/v1/notifications/read-all');
    expect(readAllRes.status).toBe(401);

    const readOneRes = await request(app).patch(`/api/v1/notifications/${buyerNotifications[0].id}/read`);
    expect(readOneRes.status).toBe(401);
  });

  it('validates query parameters and path id with Zod (400)', async () => {
    const invalidPage = await request(app)
      .get('/api/v1/notifications?page=0&limit=10')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(invalidPage.status).toBe(400);

    const invalidLimit = await request(app)
      .get('/api/v1/notifications?page=1&limit=abc')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(invalidLimit.status).toBe(400);

    const invalidId = await request(app)
      .patch('/api/v1/notifications/not-a-number/read')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(invalidId.status).toBe(400);
  });

  it('returns paginated notifications sorted createdAt desc with unreadCount and strict user isolation', async () => {
    const page1 = await request(app)
      .get('/api/v1/notifications?page=1&limit=2')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(page1.status).toBe(200);
    expect(page1.body.success).toBe(true);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.data.map((n) => n.id)).toEqual([
      buyerNotifications[2].id,
      buyerNotifications[1].id,
    ]);
    expect(page1.body.data.every((n) => n.userId === buyer.id)).toBe(true);
    expect(page1.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      unreadCount: 2,
    });

    const sellerList = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(sellerList.status).toBe(200);
    expect(sellerList.body.data).toHaveLength(2);
    expect(sellerList.body.data.every((n) => n.userId === seller.id)).toBe(true);
    expect(sellerList.body.meta.unreadCount).toBe(2);
  });

  it('marks a single owned notification as read and returns 404 for missing or foreign notification', async () => {
    const foreignRes = await request(app)
      .patch(`/api/v1/notifications/${sellerNotifications[0].id}/read`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(foreignRes.status).toBe(404);

    const missingRes = await request(app)
      .patch('/api/v1/notifications/99999999/read')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(missingRes.status).toBe(404);

    const readRes = await request(app)
      .patch(`/api/v1/notifications/${buyerNotifications[0].id}/read`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.isRead).toBe(true);

    const afterList = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(afterList.body.meta.unreadCount).toBe(1);
  });

  it('marks all unread notifications of the authenticated user as read without affecting other users', async () => {
    const readAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body.data.updatedCount).toBe(1);

    const buyerAfter = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(buyerAfter.body.meta.unreadCount).toBe(0);
    expect(buyerAfter.body.data.every((n) => n.isRead === true)).toBe(true);

    // Seller notifications must remain untouched
    const sellerAfter = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerAfter.body.meta.unreadCount).toBe(2);
  });
});
