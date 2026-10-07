import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractTenantSlug, resolveTenant, requireTenant } from '../src/middleware/tenant.middleware.js';
import { authenticate, requireTenantMembership, requireRole, requireSuperAdmin } from '../src/middleware/auth.middleware.js';
import { TenantController } from '../src/controllers/tenant.controller.js';
import { ServiceController } from '../src/controllers/service.controller.js';
import { AppError } from '../src/middleware/errorHandler.js';
import { Role, TenantStatus } from '@prisma/client';
import prisma from '../src/config/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import type { Request, Response } from 'express';

describe('SaaS Subdomain & Tenant Resolution Comprehensive Suite', () => {
  // Silence auditLog create in test context
  (prisma as any).auditLog = (prisma as any).auditLog || {};
  (prisma as any).auditLog.create = async () => ({ id: 'mock-audit' });

  it('correctly extracts slug from production subdomain (shop.bsms.com and www.shop.bsms.com)', () => {
    const mockReq1 = {
      headers: { host: 'sirajbarbers.bsms.com' },
      hostname: 'sirajbarbers.bsms.com',
    } as unknown as Request;

    const mockReq2 = {
      headers: { host: 'www.sirajbarbers.bsms.com' },
      hostname: 'www.sirajbarbers.bsms.com',
    } as unknown as Request;

    assert.strictEqual(extractTenantSlug(mockReq1), 'sirajbarbers');
    assert.strictEqual(extractTenantSlug(mockReq2), 'sirajbarbers');
  });

  it('correctly extracts slug from local development subdomain (shop.localhost:5000)', () => {
    const mockReq = {
      headers: { host: 'demo-shop.localhost:5000' },
      hostname: 'demo-shop.localhost',
    } as unknown as Request;

    assert.strictEqual(extractTenantSlug(mockReq), 'demo-shop');
  });

  it('correctly extracts slug from custom x-tenant-slug header override', () => {
    const mockReq = {
      headers: {
        host: 'localhost:5000',
        'x-tenant-slug': 'downtown-cuts',
      },
      hostname: 'localhost',
    } as unknown as Request;

    assert.strictEqual(extractTenantSlug(mockReq), 'downtown-cuts');
  });

  it('returns null for bare root domains, loopback, and platform portals', () => {
    const rootHosts = [
      'localhost',
      'localhost:5000',
      '127.0.0.1:5000',
      'bsms.com',
      'www.bsms.com',
      'api.bsms.com',
      'admin.bsms.com',
      'platform.bsms.com',
    ];

    for (const host of rootHosts) {
      const mockReq = {
        headers: { host },
        hostname: host.split(':')[0],
      } as unknown as Request;

      assert.strictEqual(
        extractTenantSlug(mockReq),
        null,
        `Expected ${host} to yield null tenant slug`
      );
    }
  });

  it('TEST A: allows valid tenant access when authenticated user has active membership in resolved tenant', () => {
    const mockReq = {
      tenantId: 'tenant-a-id',
      user: {
        id: 'user-a',
        email: 'barber@shop-a.com',
        role: Role.BARBER,
        platformRole: Role.CUSTOMER,
        activeMembership: { id: 'mem-1', tenantId: 'tenant-a-id', role: Role.BARBER, isActive: true },
        tenantId: 'tenant-a-id',
        memberships: [{ tenantId: 'tenant-a-id', role: Role.BARBER, isActive: true }],
      },
    } as unknown as Request;

    let isAuthorized = false;
    requireTenantMembership(mockReq, {} as Response, (err) => {
      isAuthorized = !err;
    });

    assert.strictEqual(isAuthorized, true, 'User with valid membership in Tenant A must be authorized');
  });

  it('TEST B: cross-tenant hostname attempt is rejected with 403 NOT_TENANT_MEMBER', () => {
    // User only has membership in Tenant A, but request is directed to Tenant B
    const mockReq = {
      tenantId: 'tenant-b-id',
      user: {
        id: 'user-a',
        email: 'barber@shop-a.com',
        role: null, // No membership in Tenant B
        platformRole: Role.CUSTOMER,
        activeMembership: null,
        tenantId: 'tenant-b-id',
        memberships: [{ tenantId: 'tenant-a-id', role: Role.BARBER, isActive: true }],
      },
    } as unknown as Request;

    let nextError: any = null;
    requireTenantMembership(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.code, 'NOT_TENANT_MEMBER');
  });

  it('TEST C: fake x-tenant-slug header cannot bypass membership authorization', () => {
    // User tries to send `x-tenant-slug: tenant-b` to access Tenant B
    const mockReq = {
      tenantId: 'tenant-b-id', // Resolved from fake header
      user: {
        id: 'user-a',
        email: 'attacker@shop-a.com',
        role: null, // Denied membership for tenant-b
        platformRole: Role.CUSTOMER,
        activeMembership: null,
        tenantId: 'tenant-b-id',
        memberships: [{ tenantId: 'tenant-a-id', role: Role.SHOP_OWNER, isActive: true }],
      },
    } as unknown as Request;

    let nextError: any = null;
    requireRole(Role.SHOP_OWNER)(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.code, 'NOT_TENANT_MEMBER');
  });

  it('TEST D: fake client tenant ID is rejected when requireTenant is enforced', () => {
    const mockReq = {
      headers: {},
      tenant: null,
      tenantId: undefined, // Unresolved
    } as unknown as Request;

    let nextError: any = null;
    requireTenant(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 400);
    assert.strictEqual(nextError.code, 'TENANT_REQUIRED');
  });

  it('TEST E: missing tenant on tenant-scoped operations fails closed with 400 TENANT_REQUIRED', () => {
    const mockReq = {
      user: {
        id: 'user-1',
        platformRole: Role.CUSTOMER,
        activeMembership: null,
        memberships: [],
      },
      tenantId: undefined,
    } as unknown as Request;

    let nextError: any = null;
    requireTenantMembership(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 400);
    assert.strictEqual(nextError.code, 'TENANT_REQUIRED');
  });

  it('TEST F: nonexistent tenant slug resolves to null tenant context', async () => {
    const originalTenantFindUnique = prisma.tenant.findUnique;
    (prisma as any).tenant.findUnique = async () => null;

    try {
      const mockReq = {
        headers: { host: 'nonexistent-shop.bsms.com' },
        path: '/api/services',
        method: 'GET',
      } as unknown as Request;

      let nextCalled = false;
      await resolveTenant(mockReq, {} as Response, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual((mockReq as any).tenantId, undefined);
      assert.strictEqual((mockReq as any).tenant, undefined);
    } finally {
      (prisma as any).tenant.findUnique = originalTenantFindUnique;
    }
  });

  it('TEST G & H: blocks mutations on SUSPENDED or ARCHIVED tenants while allowing platform operations', async () => {
    const originalTenantFindUnique = prisma.tenant.findUnique;

    try {
      // 1. Suspended
      (prisma as any).tenant.findUnique = async () => ({
        id: 'tenant-susp',
        name: 'Suspended Shop',
        slug: 'suspended-shop',
        status: TenantStatus.SUSPENDED,
      });

      const suspReq = {
        headers: { host: 'suspended-shop.bsms.com' },
        path: '/api/appointments',
        method: 'POST',
      } as unknown as Request;

      let suspError: any = null;
      await resolveTenant(suspReq, {} as Response, (err) => {
        suspError = err;
      });
      assert.ok(suspError instanceof AppError);
      assert.strictEqual(suspError.statusCode, 403);
      assert.strictEqual(suspError.code, 'TENANT_SUSPENDED');

      // 2. Archived
      (prisma as any).tenant.findUnique = async () => ({
        id: 'tenant-arch',
        name: 'Archived Shop',
        slug: 'archived-shop',
        status: TenantStatus.ARCHIVED,
      });

      const archReq = {
        headers: { host: 'archived-shop.bsms.com' },
        path: '/api/barbers',
        method: 'DELETE',
      } as unknown as Request;

      let archError: any = null;
      await resolveTenant(archReq, {} as Response, (err) => {
        archError = err;
      });
      assert.ok(archError instanceof AppError);
      assert.strictEqual(archError.statusCode, 403);
      assert.strictEqual(archError.code, 'TENANT_ARCHIVED');

      // 3. Platform route bypass
      const platformReq = {
        headers: { host: 'suspended-shop.bsms.com' },
        path: '/api/platform/businesses/tenant-susp/activate',
        method: 'POST',
      } as unknown as Request;

      let platformNext = false;
      await resolveTenant(platformReq, {} as Response, (err) => {
        platformNext = !err;
      });
      assert.strictEqual(platformNext, true, 'Platform routes must bypass tenant status checks');
    } finally {
      (prisma as any).tenant.findUnique = originalTenantFindUnique;
    }
  });

  it('TEST I: SUPER_ADMIN platform authorization is segregated from tenant roles', () => {
    const superAdminReq = {
      user: {
        id: 'super-admin-id',
        email: 'superadmin@bsms.com',
        role: Role.SUPER_ADMIN,
        platformRole: Role.SUPER_ADMIN,
        memberships: [],
      },
    } as unknown as Request;

    let superAdminPassed = false;
    requireSuperAdmin(superAdminReq, {} as Response, (err) => {
      superAdminPassed = !err;
    });
    assert.strictEqual(superAdminPassed, true);

    const normalUserReq = {
      user: {
        id: 'owner-id',
        email: 'owner@shop.com',
        role: Role.SHOP_OWNER,
        platformRole: Role.CUSTOMER,
        memberships: [{ tenantId: 'tenant-1', role: Role.SHOP_OWNER, isActive: true }],
      },
    } as unknown as Request;

    let normalUserError: any = null;
    requireSuperAdmin(normalUserReq, {} as Response, (err) => {
      normalUserError = err;
    });
    assert.ok(normalUserError instanceof AppError);
    assert.strictEqual(normalUserError.statusCode, 403);
    assert.strictEqual(normalUserError.code, 'SUPER_ADMIN_REQUIRED');
  });

  it('TEST J & K: Authenticated SHOP_OWNER can call GET /api/tenant/current and receives associated membership tenant', async () => {
    const origUserFindUnique = prisma.user.findUnique;
    const origTenantFindUnique = prisma.tenant.findUnique;

    try {
      const mockTenant = {
        id: 'tenant-owner-1',
        name: 'Prime Cuts Lounge',
        slug: 'prime-cuts',
        email: 'info@primecuts.com',
        phone: '+251911111111',
        address: 'Bole Road',
        logo: null,
        status: TenantStatus.ACTIVE,
        timezone: 'UTC',
        currency: 'ETB',
        settings: {
          id: 'set-1',
          tenantId: 'tenant-owner-1',
          primaryColor: '#d97706',
          secondaryColor: '#0f172a',
          bookingNoticeHours: 1,
          maxAdvanceBookingDays: 30,
          cancellationCutoffHours: 2,
          allowWalkIns: true,
        },
        subscriptions: [
          {
            id: 'sub-1',
            status: 'ACTIVE',
            plan: {
              id: 'plan-pro',
              name: 'Pro Tier',
              slug: 'pro',
              features: ['unlimited_barbers'],
              maxBarbers: 10,
              maxMonthlyAppointments: 500,
              price: 1200,
              interval: 'MONTHLY',
            },
          },
        ],
      };

      (prisma as any).user.findUnique = async () => ({
        id: 'user-owner-1',
        email: 'owner@primecuts.com',
        role: Role.SHOP_OWNER,
        isActive: true,
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-1',
            userId: 'user-owner-1',
            tenantId: 'tenant-owner-1',
            role: Role.SHOP_OWNER,
            isActive: true,
            tenant: mockTenant,
          },
        ],
      });

      (prisma as any).tenant.findUnique = async (args: any) => {
        if (args.where?.id === 'tenant-owner-1' || args.where?.slug === 'prime-cuts') {
          return mockTenant;
        }
        return null;
      };

      const token = jwt.sign(
        { id: 'user-owner-1', email: 'owner@primecuts.com', role: Role.SHOP_OWNER, tenantId: 'tenant-owner-1' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
          host: 'localhost',
        },
        hostname: 'localhost',
        path: '/api/tenant/current',
        method: 'GET',
      } as unknown as Request;

      let authNext = false;
      await authenticate(mockReq, {} as Response, (err) => {
        authNext = !err;
      });
      assert.strictEqual(authNext, true, 'authenticate must pass');

      let membershipNext = false;
      requireTenantMembership(mockReq, {} as Response, (err) => {
        membershipNext = !err;
      });
      assert.strictEqual(membershipNext, true, 'requireTenantMembership must pass');

      let responseStatus = 200;
      let responsePayload: any = null;
      const mockRes = {
        status(code: number) {
          responseStatus = code;
          return this;
        },
        json(payload: any) {
          responsePayload = payload;
          return this;
        },
      } as unknown as Response;

      await TenantController.getCurrent(mockReq, mockRes, () => {});

      assert.strictEqual(responseStatus, 200);
      assert.strictEqual(responsePayload.success, true);
      assert.strictEqual(responsePayload.data.id, 'tenant-owner-1');
      assert.strictEqual(responsePayload.data.name, 'Prime Cuts Lounge');
      assert.strictEqual(responsePayload.data.slug, 'prime-cuts');
      assert.strictEqual(responsePayload.data.plan.name, 'Pro Tier');
    } finally {
      (prisma as any).user.findUnique = origUserFindUnique;
      (prisma as any).tenant.findUnique = origTenantFindUnique;
    }
  });

  it('TEST L: Inactive membership cannot access GET /api/tenant/current', async () => {
    const origUserFindUnique = prisma.user.findUnique;

    try {
      (prisma as any).user.findUnique = async () => ({
        id: 'user-inactive',
        email: 'inactive@shop.com',
        role: Role.SHOP_OWNER,
        isActive: true,
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-inactive',
            userId: 'user-inactive',
            tenantId: 'tenant-inactive-shop',
            role: Role.SHOP_OWNER,
            isActive: false, // Inactive membership
          },
        ],
      });

      const token = jwt.sign(
        { id: 'user-inactive', email: 'inactive@shop.com', role: Role.SHOP_OWNER, tenantId: 'tenant-inactive-shop' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockReq = {
        headers: { authorization: `Bearer ${token}` },
        path: '/api/tenant/current',
        method: 'GET',
      } as unknown as Request;

      await authenticate(mockReq, {} as Response, () => {});

      let membershipError: any = null;
      requireTenantMembership(mockReq, {} as Response, (err) => {
        membershipError = err;
      });

      assert.ok(membershipError instanceof AppError);
      assert.strictEqual(membershipError.statusCode, 403);
      assert.strictEqual(membershipError.code, 'NOT_TENANT_MEMBER');
    } finally {
      (prisma as any).user.findUnique = origUserFindUnique;
    }
  });

  it('TEST M: Missing or invalid authentication token cannot obtain tenant context', async () => {
    // 1. Missing token
    const missingReq = {
      headers: {},
      path: '/api/tenant/current',
      method: 'GET',
    } as unknown as Request;

    let missingError: any = null;
    await authenticate(missingReq, {} as Response, (err) => {
      missingError = err;
    });
    assert.ok(missingError instanceof AppError);
    assert.strictEqual(missingError.statusCode, 401);
    assert.strictEqual(missingError.code, 'UNAUTHORIZED');

    // 2. Invalid token
    const invalidReq = {
      headers: { authorization: 'Bearer invalid.token.string' },
      path: '/api/tenant/current',
      method: 'GET',
    } as unknown as Request;

    let invalidError: any = null;
    await authenticate(invalidReq, {} as Response, (err) => {
      invalidError = err;
    });
    assert.ok(invalidError instanceof AppError);
    assert.strictEqual(invalidError.statusCode, 401);
    assert.strictEqual(invalidError.code, 'TOKEN_INVALID');
  });

  it('TEST N: Spoofed tenant header cannot switch the authenticated user tenant context', async () => {
    const origUserFindUnique = prisma.user.findUnique;
    const origTenantFindUnique = prisma.tenant.findUnique;

    try {
      (prisma as any).tenant.findUnique = async (args: any) => {
        if (args.where?.slug === 'victim-shop') {
          return {
            id: 'victim-tenant-id',
            name: 'Victim Barbershop',
            slug: 'victim-shop',
            status: TenantStatus.ACTIVE,
          };
        }
        return null;
      };

      (prisma as any).user.findUnique = async () => ({
        id: 'attacker-user',
        email: 'attacker@my-shop.com',
        role: Role.SHOP_OWNER,
        isActive: true,
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-attacker',
            userId: 'attacker-user',
            tenantId: 'attacker-tenant-id', // Attacker only belongs to attacker-tenant-id
            role: Role.SHOP_OWNER,
            isActive: true,
          },
        ],
      });

      const token = jwt.sign(
        { id: 'attacker-user', email: 'attacker@my-shop.com', role: Role.SHOP_OWNER, tenantId: 'attacker-tenant-id' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-tenant-slug': 'victim-shop', // Attempt to spoof another shop's tenant slug
        },
        path: '/api/tenant/current',
        method: 'GET',
      } as unknown as Request;

      // resolveTenant immediately detects spoofing and fails closed with 403
      let resolveError: any = null;
      await resolveTenant(mockReq, {} as Response, (err) => {
        resolveError = err;
      });

      assert.ok(resolveError instanceof AppError);
      assert.strictEqual(resolveError.statusCode, 403);
      assert.strictEqual(resolveError.code, 'NOT_TENANT_MEMBER');
      assert.strictEqual(mockReq.tenantId, undefined, 'Spoofed tenant must never be attached to request');
    } finally {
      (prisma as any).user.findUnique = origUserFindUnique;
      (prisma as any).tenant.findUnique = origTenantFindUnique;
    }
  });

  it('TEST O: Exact /api/services reproduction: SHOP_OWNER cannot access another tenant by sending x-tenant-slug: demo-shop', async () => {
    const origUserFindUnique = prisma.user.findUnique;
    const origTenantFindUnique = prisma.tenant.findUnique;

    try {
      (prisma as any).tenant.findUnique = async (args: any) => {
        if (args.where?.slug === 'demo-shop') {
          return {
            id: 'demo-shop-id',
            name: 'Demo Barbershop',
            slug: 'demo-shop',
            status: TenantStatus.ACTIVE,
          };
        }
        return null;
      };

      (prisma as any).user.findUnique = async () => ({
        id: 'owner-local-id',
        email: 'owner@local-test-shop.com',
        role: Role.SHOP_OWNER,
        isActive: true,
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-local',
            userId: 'owner-local-id',
            tenantId: 'local-test-shop-id', // Authorized ONLY for local-test-shop
            role: Role.SHOP_OWNER,
            isActive: true,
          },
        ],
      });

      const token = jwt.sign(
        { id: 'owner-local-id', email: 'owner@local-test-shop.com', role: Role.SHOP_OWNER, tenantId: 'local-test-shop-id' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockReq = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-tenant-slug': 'demo-shop', // Spoofing attempt
        },
        path: '/api/services',
        method: 'GET',
      } as unknown as Request;

      let caughtError: any = null;
      await resolveTenant(mockReq, {} as Response, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError instanceof AppError, 'Must fail closed with AppError');
      assert.strictEqual(caughtError.statusCode, 403, 'Must return HTTP 403 Forbidden');
      assert.strictEqual(caughtError.code, 'NOT_TENANT_MEMBER', 'Must return code NOT_TENANT_MEMBER');
      assert.strictEqual(mockReq.tenantId, undefined, 'demo-shop tenant ID must NOT be assigned to request');
    } finally {
      (prisma as any).user.findUnique = origUserFindUnique;
      (prisma as any).tenant.findUnique = origTenantFindUnique;
    }
  });

  it('TEST P: Exact /api/services verification: SHOP_OWNER accesses own tenant services with or without x-tenant-slug', async () => {
    const origUserFindUnique = prisma.user.findUnique;
    const origTenantFindUnique = prisma.tenant.findUnique;
    const origServiceFindMany = prisma.service.findMany;

    try {
      const mockLocalTenant = {
        id: 'local-test-shop-id',
        name: 'Local Test Shop',
        slug: 'local-test-shop',
        status: TenantStatus.ACTIVE,
      };

      (prisma as any).tenant.findUnique = async (args: any) => {
        if (args.where?.slug === 'local-test-shop' || args.where?.id === 'local-test-shop-id') {
          return mockLocalTenant;
        }
        return null;
      };

      (prisma as any).user.findUnique = async () => ({
        id: 'owner-local-id',
        email: 'owner@local-test-shop.com',
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
            tenant: mockLocalTenant,
          },
        ],
      });

      let queriedTenantId: string | undefined;
      (prisma as any).service.findMany = async (args: any) => {
        queriedTenantId = args.where?.tenantId;
        return [
          { id: 'srv-1', tenantId: 'local-test-shop-id', name: 'Classic Fade', price: 350, isActive: true },
        ];
      };

      const token = jwt.sign(
        { id: 'owner-local-id', email: 'owner@local-test-shop.com', role: Role.SHOP_OWNER, tenantId: 'local-test-shop-id' },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Case A: With valid matching x-tenant-slug
      const reqWithSlug = {
        headers: {
          authorization: `Bearer ${token}`,
          'x-tenant-slug': 'local-test-shop',
        },
        path: '/api/services',
        method: 'GET',
        query: {},
      } as unknown as Request;

      let errorWithSlug: any = null;
      await resolveTenant(reqWithSlug, {} as Response, (err) => {
        errorWithSlug = err;
      });
      assert.strictEqual(errorWithSlug, undefined);
      assert.strictEqual(reqWithSlug.tenantId, 'local-test-shop-id');

      let jsonPayloadWithSlug: any = null;
      const resWithSlug = {
        status() { return this; },
        json(payload: any) { jsonPayloadWithSlug = payload; return this; },
      } as unknown as Response;

      await ServiceController.getAll(reqWithSlug, resWithSlug, () => {});
      assert.strictEqual(jsonPayloadWithSlug.success, true);
      assert.strictEqual(queriedTenantId, 'local-test-shop-id');
      assert.strictEqual(jsonPayloadWithSlug.data[0].name, 'Classic Fade');

      // Case C: Without x-tenant-slug (e.g. on localhost)
      const reqWithoutSlug = {
        headers: {
          authorization: `Bearer ${token}`,
        },
        path: '/api/services',
        method: 'GET',
        query: {},
      } as unknown as Request;

      let errorWithoutSlug: any = null;
      await resolveTenant(reqWithoutSlug, {} as Response, (err) => {
        errorWithoutSlug = err;
      });
      assert.strictEqual(errorWithoutSlug, undefined);
      assert.strictEqual(reqWithoutSlug.tenantId, 'local-test-shop-id');

      let jsonPayloadWithoutSlug: any = null;
      const resWithoutSlug = {
        status() { return this; },
        json(payload: any) { jsonPayloadWithoutSlug = payload; return this; },
      } as unknown as Response;

      await ServiceController.getAll(reqWithoutSlug, resWithoutSlug, () => {});
      assert.strictEqual(jsonPayloadWithoutSlug.success, true);
      assert.strictEqual(queriedTenantId, 'local-test-shop-id');
    } finally {
      (prisma as any).user.findUnique = origUserFindUnique;
      (prisma as any).tenant.findUnique = origTenantFindUnique;
      (prisma as any).service.findMany = origServiceFindMany;
    }
  });

  it('TEST Q: Public user without auth can view public services for requested tenant', async () => {
    const origTenantFindUnique = prisma.tenant.findUnique;
    const origServiceFindMany = prisma.service.findMany;

    try {
      (prisma as any).tenant.findUnique = async (args: any) => {
        if (args.where?.slug === 'demo-shop') {
          return {
            id: 'demo-shop-id',
            name: 'Demo Barbershop',
            slug: 'demo-shop',
            status: TenantStatus.ACTIVE,
          };
        }
        return null;
      };

      let queriedTenantId: string | undefined;
      (prisma as any).service.findMany = async (args: any) => {
        queriedTenantId = args.where?.tenantId;
        return [
          { id: 'srv-demo-1', tenantId: 'demo-shop-id', name: 'Demo Beard Trim', price: 200, isActive: true },
        ];
      };

      const publicReq = {
        headers: {
          'x-tenant-slug': 'demo-shop', // No authorization header
        },
        path: '/api/services',
        method: 'GET',
        query: {},
      } as unknown as Request;

      let publicError: any = null;
      await resolveTenant(publicReq, {} as Response, (err) => {
        publicError = err;
      });
      assert.strictEqual(publicError, undefined);
      assert.strictEqual(publicReq.tenantId, 'demo-shop-id');

      let publicJson: any = null;
      const publicRes = {
        status() { return this; },
        json(payload: any) { publicJson = payload; return this; },
      } as unknown as Response;

      await ServiceController.getAll(publicReq, publicRes, () => {});
      assert.strictEqual(publicJson.success, true);
      assert.strictEqual(queriedTenantId, 'demo-shop-id');
      assert.strictEqual(publicJson.data[0].name, 'Demo Beard Trim');
    } finally {
      (prisma as any).tenant.findUnique = origTenantFindUnique;
      (prisma as any).service.findMany = origServiceFindMany;
    }
  });
});
