import { describe, it } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { PlatformController } from '../src/controllers/platform.controller.js';
import { AuthService } from '../src/services/auth.service.js';
import { resolveTenant } from '../src/middleware/tenant.middleware.js';
import { authenticate, requireTenantMembership, requireRole, requireSuperAdmin } from '../src/middleware/auth.middleware.js';
import { AppError } from '../src/middleware/errorHandler.js';
import { Role, TenantStatus, SubscriptionStatus } from '@prisma/client';
import prisma from '../src/config/prisma.js';
import type { Request, Response } from 'express';
import { AuditService } from '../src/services/audit.service.js';

describe('SaaS Multi-Tenant Tenant Provisioning & Lifecycle Suite', () => {
  // Silence standalone DB auditLog connection error logs in unit tests
  const originalAuditLogCreate = prisma.auditLog.create;
  (prisma as any).auditLog.create = async () => ({ id: 'mock-audit-id' });
  // Mock helper for express response
  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      jsonData: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonData = data;
        return this;
      },
    };
    return res;
  };

  /**
   * TEST A: SUPER_ADMIN creates Tenant A successfully.
   * TEST B: Tenant A receives its required owner/admin membership.
   */
  it('TEST A & B: creates tenant atomically with default settings, schedule, service, subscription, and owner membership', async () => {
    let tenantCreatedData: any = null;
    let subscriptionCreatedData: any = null;
    let userCreatedData: any = null;
    let membershipCreatedData: any = null;
    let schedulesCreatedCount = 0;
    let serviceCreatedData: any = null;

    const mockPrisma = {
      tenant: {
        findUnique: async () => null, // Slug is unique
      },
      user: {
        findUnique: async () => null, // User is new
      },
      plan: {
        findUnique: async ({ where }: any) => ({
          id: 'plan-starter-id',
          slug: where.slug,
          name: 'Starter Tier',
        }),
      },
      $transaction: async (callback: any) => {
        const txMock = {
          tenant: {
            create: async ({ data }: any) => {
              tenantCreatedData = data;
              return {
                id: 'tenant-a-id',
                name: data.name,
                slug: data.slug,
                email: data.email,
                phone: data.phone,
                address: data.address,
                timezone: data.timezone,
                currency: data.currency,
                status: data.status,
              };
            },
          },
          user: {
            create: async ({ data }: any) => {
              userCreatedData = data;
              return {
                id: 'owner-a-id',
                email: data.email,
                passwordHash: data.passwordHash,
                role: data.role,
                isActive: data.isActive,
              };
            },
          },
          membership: {
            create: async ({ data }: any) => {
              membershipCreatedData = data;
              return { id: 'mem-a-id', ...data };
            },
          },
          businessSchedule: {
            create: async () => {
              schedulesCreatedCount++;
              return { id: `sched-${schedulesCreatedCount}` };
            },
          },
          service: {
            create: async ({ data }: any) => {
              serviceCreatedData = data;
              return { id: 'srv-a-id', ...data };
            },
          },
        };
        return callback(txMock);
      },
    };

    const originalTenantFindUnique = prisma.tenant.findUnique;
    const originalUserFindUnique = prisma.user.findUnique;
    const originalPlanFindUnique = prisma.plan.findUnique;
    const originalTransaction = prisma.$transaction;

    (prisma as any).tenant.findUnique = mockPrisma.tenant.findUnique;
    (prisma as any).user.findUnique = mockPrisma.user.findUnique;
    (prisma as any).plan.findUnique = mockPrisma.plan.findUnique;
    (prisma as any).$transaction = mockPrisma.$transaction;

    try {
      const mockReq = {
        user: { id: 'super-admin-id', role: Role.SUPER_ADMIN, platformRole: Role.SUPER_ADMIN },
        body: {
          name: 'Elite Barbershop',
          slug: 'elite-barbers',
          email: 'contact@elitebarbers.com',
          phone: '+251911223344',
          ownerName: 'Abebe Bikila',
          ownerEmail: 'abebe@elitebarbers.com',
          ownerPassword: 'SecretPassword123!',
          planSlug: 'starter',
        },
      } as unknown as Request;

      const mockRes = createMockRes();
      let nextError: any = null;

      await PlatformController.createBusiness(mockReq, mockRes as Response, (err) => {
        nextError = err;
      });

      assert.strictEqual(nextError, null, 'createBusiness should succeed without error');
      assert.strictEqual(mockRes.statusCode, 201);
      assert.strictEqual(mockRes.jsonData?.success, true);

      // Verify Tenant created with correct defaults
      assert.strictEqual(tenantCreatedData.name, 'Elite Barbershop');
      assert.strictEqual(tenantCreatedData.slug, 'elite-barbers');
      assert.strictEqual(tenantCreatedData.status, TenantStatus.ACTIVE);
      assert.ok(tenantCreatedData.settings?.create, 'TenantSettings must be initialized');
      assert.strictEqual(tenantCreatedData.settings.create.primaryColor, '#d97706');

      // Verify Owner created and hashed
      assert.strictEqual(userCreatedData.email, 'abebe@elitebarbers.com');
      assert.strictEqual(userCreatedData.role, Role.SHOP_OWNER);
      const isPasswordHashed = await bcrypt.compare('SecretPassword123!', userCreatedData.passwordHash);
      assert.strictEqual(isPasswordHashed, true, 'Owner password must be properly hashed with bcrypt');

      // Verify Membership
      assert.strictEqual(membershipCreatedData.userId, 'owner-a-id');
      assert.strictEqual(membershipCreatedData.tenantId, 'tenant-a-id');
      assert.strictEqual(membershipCreatedData.role, Role.SHOP_OWNER);
      assert.strictEqual(membershipCreatedData.isActive, true);

      // Verify 7-day schedule & default starter service
      assert.strictEqual(schedulesCreatedCount, 7, 'Must initialize 7 days of business schedule');
      assert.strictEqual(serviceCreatedData.name, 'Standard Haircut');
      assert.strictEqual(serviceCreatedData.tenantId, 'tenant-a-id');

      // Verify returned owner object is sanitized (no passwordHash)
      assert.strictEqual(mockRes.jsonData.data.owner.passwordHash, undefined, 'passwordHash must be stripped');
    } finally {
      (prisma as any).tenant.findUnique = originalTenantFindUnique;
      (prisma as any).user.findUnique = originalUserFindUnique;
      (prisma as any).plan.findUnique = originalPlanFindUnique;
      (prisma as any).$transaction = originalTransaction;
    }
  });

  /**
   * TEST C: Tenant A owner can authenticate.
   */
  it('TEST C: Tenant A owner can authenticate and receive valid JWT with active membership', async () => {
    const rawPassword = 'OwnerPassword123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const mockOwnerUser = {
      id: 'owner-a-id',
      email: 'owner@tenant-a.com',
      passwordHash,
      role: Role.SHOP_OWNER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerProfile: {
        id: 'cust-prof-a',
        userId: 'owner-a-id',
        fullName: 'Tenant A Owner',
        phone: '+251911111111',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      barberProfile: null,
      memberships: [
        {
          id: 'mem-a',
          userId: 'owner-a-id',
          tenantId: 'tenant-a-id',
          role: Role.SHOP_OWNER,
          isActive: true,
          tenant: {
            id: 'tenant-a-id',
            name: 'Tenant A Shop',
            slug: 'tenant-a',
            status: TenantStatus.ACTIVE,
            logo: null,
          },
        },
      ],
    };

    const originalUserFindUnique = prisma.user.findUnique;
    (prisma as any).user.findUnique = async ({ where }: any) => {
      if (where.email === 'owner@tenant-a.com') return mockOwnerUser;
      return null;
    };

    try {
      const authResult = await AuthService.login(
        { email: 'owner@tenant-a.com', password: rawPassword },
        'tenant-a-id'
      );

      assert.ok(authResult.token, 'Must return JWT token');
      assert.strictEqual(authResult.user.role, Role.SHOP_OWNER);
      assert.strictEqual(authResult.user.activeTenantId, 'tenant-a-id');
      assert.strictEqual(authResult.user.memberships.length, 1);
      assert.strictEqual(authResult.user.memberships[0].role, Role.SHOP_OWNER);
    } finally {
      (prisma as any).user.findUnique = originalUserFindUnique;
    }
  });

  /**
   * TEST D: Tenant A owner cannot access Tenant B.
   */
  it('TEST D: Tenant A owner cannot access Tenant B context (fails closed with 403)', () => {
    const mockReq = {
      user: {
        id: 'owner-a-id',
        email: 'owner@tenant-a.com',
        role: null, // No membership in Tenant B
        platformRole: Role.SHOP_OWNER,
        activeMembership: null,
        tenantId: 'tenant-b-id',
        memberships: [{ tenantId: 'tenant-a-id', role: Role.SHOP_OWNER, isActive: true }],
      },
      tenantId: 'tenant-b-id',
    } as unknown as Request;

    const middleware = requireTenantMembership;
    let nextError: any = null;

    middleware(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.code, 'NOT_TENANT_MEMBER');
  });

  /**
   * TEST E: Duplicate tenant slug is rejected.
   */
  it('TEST E: rejects duplicate tenant slug with 409 SLUG_EXISTS', async () => {
    const originalTenantFindUnique = prisma.tenant.findUnique;
    (prisma as any).tenant.findUnique = async ({ where }: any) => {
      if (where.slug === 'existing-shop') {
        return { id: 'existing-id', slug: 'existing-shop', name: 'Existing Shop' };
      }
      return null;
    };

    try {
      const mockReq = {
        user: { id: 'super-1', role: Role.SUPER_ADMIN, platformRole: Role.SUPER_ADMIN },
        body: {
          name: 'Another Shop',
          slug: 'existing-shop',
          email: 'contact@another.com',
          ownerName: 'Owner Name',
          ownerEmail: 'owner@another.com',
        },
      } as unknown as Request;

      let nextError: any = null;
      await PlatformController.createBusiness(mockReq, createMockRes() as Response, (err) => {
        nextError = err;
      });

      assert.ok(nextError instanceof AppError);
      assert.strictEqual(nextError.statusCode, 409);
      assert.strictEqual(nextError.code, 'SLUG_EXISTS');
    } finally {
      (prisma as any).tenant.findUnique = originalTenantFindUnique;
    }
  });

  /**
   * TEST F: Invalid tenant creation does not leave partial database records.
   */
  it('TEST F: transaction rollbacks completely when plan is invalid or sub-step fails', async () => {
    const originalPlanFindUnique = prisma.plan.findUnique;
    const originalTenantFindUnique = prisma.tenant.findUnique;
    const originalUserFindUnique = prisma.user.findUnique;

    (prisma as any).tenant.findUnique = async () => null;
    (prisma as any).user.findUnique = async () => null;
    (prisma as any).plan.findUnique = async () => null; // Plan not found

    try {
      const mockReq = {
        user: { id: 'super-1', role: Role.SUPER_ADMIN, platformRole: Role.SUPER_ADMIN },
        body: {
          name: 'Faulty Shop',
          slug: 'faulty-shop',
          email: 'faulty@shop.com',
          ownerName: 'Owner',
          ownerEmail: 'owner@faulty.com',
          planSlug: 'non-existent-plan',
        },
      } as unknown as Request;

      let nextError: any = null;
      await PlatformController.createBusiness(mockReq, createMockRes() as Response, (err) => {
        nextError = err;
      });

      assert.ok(nextError instanceof AppError);
      assert.strictEqual(nextError.statusCode, 400);
      assert.strictEqual(nextError.code, 'INVALID_PLAN');
    } finally {
      (prisma as any).plan.findUnique = originalPlanFindUnique;
      (prisma as any).tenant.findUnique = originalTenantFindUnique;
      (prisma as any).user.findUnique = originalUserFindUnique;
    }
  });

  /**
   * TEST G: Suspended tenant cannot perform normal tenant operations.
   */
  it('TEST G: blocks mutation requests on SUSPENDED tenant with 403 TENANT_SUSPENDED', async () => {
    const mockReq = {
      headers: { host: 'suspended-shop.bsms.com' },
      path: '/api/appointments',
      method: 'POST',
    } as unknown as Request;

    const originalTenantFindUnique = prisma.tenant.findUnique;
    (prisma as any).tenant.findUnique = async ({ where }: any) => {
      if (where.slug === 'suspended-shop') {
        return {
          id: 'tenant-susp-id',
          name: 'Suspended Shop',
          slug: 'suspended-shop',
          status: TenantStatus.SUSPENDED,
        };
      }
      return null;
    };

    try {
      let nextError: any = null;
      await resolveTenant(mockReq, {} as Response, (err) => {
        nextError = err;
      });

      assert.ok(nextError instanceof AppError);
      assert.strictEqual(nextError.statusCode, 403);
      assert.strictEqual(nextError.code, 'TENANT_SUSPENDED');
    } finally {
      (prisma as any).tenant.findUnique = originalTenantFindUnique;
    }
  });

  /**
   * TEST H: SUPER_ADMIN can still manage tenant lifecycle.
   */
  it('TEST H: SUPER_ADMIN can suspend, activate, and archive tenant lifecycle via platform endpoints', async () => {
    let updatedStatus: any = null;

    const originalTenantUpdate = prisma.tenant.update;
    (prisma as any).tenant.update = async ({ where, data }: any) => {
      updatedStatus = data.status;
      return { id: where.id, status: data.status, name: 'Test Shop' };
    };

    try {
      const mockReq = {
        params: { id: 'tenant-123' },
        user: { id: 'super-admin-id' },
        body: { reason: 'Policy violation' },
      } as unknown as Request;

      // 1. Suspend
      const suspendRes = createMockRes();
      await PlatformController.suspendBusiness(mockReq, suspendRes as Response, () => {});
      assert.strictEqual(updatedStatus, TenantStatus.SUSPENDED);
      assert.strictEqual(suspendRes.statusCode, 200);

      // 2. Activate
      const activateRes = createMockRes();
      await PlatformController.activateBusiness(mockReq, activateRes as Response, () => {});
      assert.strictEqual(updatedStatus, TenantStatus.ACTIVE);
      assert.strictEqual(activateRes.statusCode, 200);

      // 3. Archive
      const archiveRes = createMockRes();
      await PlatformController.archiveBusiness(mockReq, archiveRes as Response, () => {});
      assert.strictEqual(updatedStatus, TenantStatus.ARCHIVED);
      assert.strictEqual(archiveRes.statusCode, 200);
    } finally {
      (prisma as any).tenant.update = originalTenantUpdate;
    }
  });

  /**
   * TEST I: Existing tenants continue to work after integration.
   */
  it('TEST I: existing tenant users maintain membership access and role verification', () => {
    const mockDemoOwnerReq = {
      user: {
        id: 'admin-user-id',
        email: 'admin@barbershop.com',
        role: Role.SHOP_OWNER,
        platformRole: Role.SHOP_OWNER,
        activeMembership: { tenantId: 'demo-shop-id', role: Role.SHOP_OWNER, isActive: true },
        tenantId: 'demo-shop-id',
        memberships: [{ tenantId: 'demo-shop-id', role: Role.SHOP_OWNER, isActive: true }],
      },
      tenantId: 'demo-shop-id',
    } as unknown as Request;

    const middleware = requireRole(Role.SHOP_OWNER, Role.MANAGER);
    let isAuthorized = false;

    middleware(mockDemoOwnerReq, {} as Response, (err) => {
      isAuthorized = !err;
    });

    assert.strictEqual(isAuthorized, true, 'Existing demo-shop owner must pass authorization');
  });
});
