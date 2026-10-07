import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { Role, TenantStatus } from '@prisma/client';
import prisma from '../src/config/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import type { Server } from 'http';

describe('API Foundation & Health Check Tests', () => {
  let server: Server;
  const port = 5099;
  const baseUrl = `http://localhost:${port}`;

  it('starts app and responds 200 OK on GET /api/health', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => resolve());
    });

    try {
      const res = await fetch(`${baseUrl}/api/health`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.status, 'UP');
      assert.ok(json.message.includes('healthy'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('returns 404 with standard error JSON on unknown route', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => resolve());
    });

    try {
      const res = await fetch(`${baseUrl}/api/non-existent-route`);
      const json = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.code, 'NOT_FOUND');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('responds 200 OK over HTTP for GET /api/tenant/current with valid SHOP_OWNER JWT', async () => {
    const origUserFindUnique = prisma.user.findUnique;
    const origTenantFindUnique = prisma.tenant.findUnique;

    try {
      const mockTenant = {
        id: 'local-test-shop-id',
        name: 'Local Test Barbershop',
        slug: 'local-test-shop',
        email: 'owner@localtest.com',
        phone: '+251912345678',
        address: 'Bole Atlas',
        logo: null,
        status: TenantStatus.ACTIVE,
        timezone: 'UTC',
        currency: 'ETB',
        settings: {
          id: 'set-local',
          tenantId: 'local-test-shop-id',
          primaryColor: '#d97706',
          secondaryColor: '#0f172a',
          bookingNoticeHours: 1,
          maxAdvanceBookingDays: 30,
          cancellationCutoffHours: 2,
          allowWalkIns: true,
        },
        subscriptions: [
          {
            id: 'sub-local',
            status: 'ACTIVE',
            plan: {
              id: 'plan-starter',
              name: 'Starter Plan',
              slug: 'starter',
              features: ['basic'],
              maxBarbers: 5,
              maxMonthlyAppointments: 200,
              price: 500,
              interval: 'MONTHLY',
            },
          },
        ],
      };

      (prisma as any).user.findUnique = async () => ({
        id: 'owner-local-id',
        email: 'owner@localtest.com',
        role: Role.SHOP_OWNER,
        isActive: true,
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-local',
            userId: 'owner-local-id',
            tenantId: 'local-test-shop-id',
            role: Role.SHOP_OWNER,
            isActive: true,
            tenant: mockTenant,
          },
        ],
      });

      (prisma as any).tenant.findUnique = async () => mockTenant;

      const token = jwt.sign(
        { id: 'owner-local-id', email: 'owner@localtest.com', role: Role.SHOP_OWNER, tenantId: 'local-test-shop-id' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const app = createApp();
      await new Promise<void>((resolve) => {
        server = app.listen(port, () => resolve());
      });

      // 1. Authenticated request over HTTP
      const res = await fetch(`${baseUrl}/api/tenant/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.id, 'local-test-shop-id');
      assert.strictEqual(json.data.slug, 'local-test-shop');
      assert.strictEqual(json.data.name, 'Local Test Barbershop');
      assert.strictEqual(json.data.plan.name, 'Starter Plan');

      // 2. Unauthenticated request over HTTP
      const unauthRes = await fetch(`${baseUrl}/api/tenant/current`);
      const unauthJson = await unauthRes.json();

      assert.strictEqual(unauthRes.status, 401);
      assert.strictEqual(unauthJson.success, false);
      assert.strictEqual(unauthJson.code, 'UNAUTHORIZED');
    } finally {
      (prisma as any).user.findUnique = origUserFindUnique;
      (prisma as any).tenant.findUnique = origTenantFindUnique;
      if (server) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  });
});
