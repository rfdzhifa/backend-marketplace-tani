import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../app.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { authenticate } from '../src/middlewares/authenticate.js';
import { authorize } from '../src/middlewares/authorize.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { ROLES } from '../src/shared/constants/roles.js';

const testRunId = Date.now();
const buyerEmail = `buyer.${testRunId}@mail.com`;
const sellerEmail = `seller.${testRunId}@mail.com`;
const createdEmails = [buyerEmail, sellerEmail];

let buyerToken = '';
let sellerToken = '';
let sellerUserId = null;

describe('Module 1: Authentication & Authorization (UC-01, UC-02, UC-03)', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: createdEmails } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: createdEmails } },
    });
    await prisma.$disconnect();
  });

  it('Scenario 1: Register valid BUYER and SELLER -> 201, stored in DB with hashed password, no password_hash in response', async () => {
    const sellerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Budi Santoso',
      email: sellerEmail,
      phone: '081234567890',
      password: 'rahasia123',
      role: 'SELLER',
    });

    expect(sellerRes.status).toBe(201);
    expect(sellerRes.body.success).toBe(true);
    expect(sellerRes.body.message).toBe('Registrasi berhasil');
    expect(sellerRes.body.data).toMatchObject({
      name: 'Budi Santoso',
      email: sellerEmail,
      phone: '081234567890',
      role: 'SELLER',
    });
    expect(sellerRes.body.data.id).toBeTypeOf('number');
    expect(sellerRes.body.data).not.toHaveProperty('password');
    expect(sellerRes.body.data).not.toHaveProperty('password_hash');
    expect(sellerRes.body.data).not.toHaveProperty('passwordHash');

    sellerUserId = sellerRes.body.data.id;

    const dbUser = await prisma.user.findUnique({ where: { email: sellerEmail } });
    expect(dbUser).not.toBeNull();
    expect(dbUser.passwordHash).not.toBe('rahasia123');
    expect(dbUser.passwordHash).toMatch(/^\$2[ab]\$/);

    const buyerRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Siti Aminah',
      email: buyerEmail,
      phone: '+6281234567891',
      password: 'pembeli123',
      role: 'BUYER',
    });

    expect(buyerRes.status).toBe(201);
    expect(buyerRes.body.success).toBe(true);
    expect(buyerRes.body.data.role).toBe('BUYER');
    expect(buyerRes.body.data).not.toHaveProperty('password_hash');
  });

  it('Scenario 2: Register with empty fields / invalid email / weak password / invalid phone -> 400 with errors[]', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      phone: '12345',
      password: 'short',
      role: 'SELLER',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('email');
    expect(fields).toContain('phone');
    expect(fields).toContain('password');
  });

  it('Scenario 3: Register with duplicate email (case-insensitive) -> 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Budi Duplikat',
      email: sellerEmail.toUpperCase(),
      phone: '081234567899',
      password: 'rahasia123',
      role: 'SELLER',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email sudah terdaftar');
  });

  it('Scenario 4: Register with role outside enum -> 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Admin User',
      email: `admin.${testRunId}@mail.com`,
      phone: '081234567890',
      password: 'rahasia123',
      role: 'ADMIN',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('role');
  });

  it('Scenario 5: Login with valid credentials -> 200, valid JWT, user object without password_hash', async () => {
    const sellerLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: sellerEmail.toUpperCase(),
      password: 'rahasia123',
    });

    expect(sellerLoginRes.status).toBe(200);
    expect(sellerLoginRes.body.success).toBe(true);
    expect(sellerLoginRes.body.message).toBe('Login berhasil');
    expect(sellerLoginRes.body.data.token).toBeTypeOf('string');
    expect(sellerLoginRes.body.data.user).toEqual({
      id: sellerUserId,
      name: 'Budi Santoso',
      email: sellerEmail,
      phone: '081234567890',
      role: 'SELLER',
    });
    expect(sellerLoginRes.body.data.user).not.toHaveProperty('password_hash');

    sellerToken = sellerLoginRes.body.data.token;
    const decoded = jwt.verify(sellerToken, env.JWT_SECRET);
    expect(decoded.sub).toBe(sellerUserId);
    expect(decoded.role).toBe('SELLER');

    const buyerLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: buyerEmail,
      password: 'pembeli123',
    });
    expect(buyerLoginRes.status).toBe(200);
    buyerToken = buyerLoginRes.body.data.token;
  });

  it('Scenario 6: Login with wrong password or unregistered email -> 401 with identical generic message', async () => {
    const wrongPassRes = await request(app).post('/api/v1/auth/login').send({
      email: sellerEmail,
      password: 'wrongpassword123',
    });

    const unknownEmailRes = await request(app).post('/api/v1/auth/login').send({
      email: `nonexistent.${testRunId}@mail.com`,
      password: 'rahasia123',
    });

    expect(wrongPassRes.status).toBe(401);
    expect(unknownEmailRes.status).toBe(401);
    expect(wrongPassRes.body.message).toBe('Email atau password salah');
    expect(unknownEmailRes.body.message).toBe('Email atau password salah');
    expect(wrongPassRes.body.message).toBe(unknownEmailRes.body.message);
  });

  it('Scenario 7: GET /auth/profile without token / malformed token / expired token -> 401', async () => {
    const noTokenRes = await request(app).get('/api/v1/auth/profile');
    expect(noTokenRes.status).toBe(401);

    const badTokenRes = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(badTokenRes.status).toBe(401);

    const expiredToken = jwt.sign(
      { sub: sellerUserId, role: 'SELLER' },
      env.JWT_SECRET,
      { expiresIn: '-10s' },
    );
    const expiredTokenRes = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(expiredTokenRes.status).toBe(401);
  });

  it('Scenario 8: GET /auth/profile with valid token -> 200, returns user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Berhasil');
    expect(res.body.data).toEqual({
      id: sellerUserId,
      name: 'Budi Santoso',
      email: sellerEmail,
      phone: '081234567890',
      role: 'SELLER',
    });
  });

  it('Scenario 9: PUT /auth/profile valid -> 200, updates name and phone, ignores email and role changes', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Budi S.',
        phone: '081298765432',
        email: 'hacked@mail.com',
        role: 'BUYER',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Profil berhasil diperbarui');
    expect(res.body.data).toEqual({
      id: sellerUserId,
      name: 'Budi S.',
      email: sellerEmail,
      phone: '081298765432',
      role: 'SELLER',
    });
  });

  it('Scenario 10: PUT /auth/profile with invalid data -> 400', async () => {
    const res = await request(app)
      .put('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'B',
        phone: 'invalid-phone',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toContain('name');
    expect(fields).toContain('phone');
  });

  it('Scenario 11: authorize("SELLER") accessed by BUYER -> 403, accessed by SELLER -> 200', async () => {
    const testApp = express();
    testApp.get(
      '/seller-only',
      authenticate,
      authorize(ROLES.SELLER),
      (_req, res) => res.status(200).json({ success: true }),
    );
    testApp.use(errorHandler);

    const buyerAttempt = await request(testApp)
      .get('/seller-only')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(buyerAttempt.status).toBe(403);
    expect(buyerAttempt.body.success).toBe(false);

    const sellerAttempt = await request(testApp)
      .get('/seller-only')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(sellerAttempt.status).toBe(200);
    expect(sellerAttempt.body.success).toBe(true);
  });
});

