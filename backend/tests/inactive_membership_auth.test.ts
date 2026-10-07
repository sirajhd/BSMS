import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, TenantStatus } from '@prisma/client';
import { createApp } from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { AuthService } from '../src/services/auth.service.js';
import { env } from '../src/config/env.js';

describe('Security Regression Suite: Inactive Tenant Membership Authentication', () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantA = {
    id: 'tenant-sec-a',
    name: 'Addis Cuts',
    slug: 'addis-cuts',
    status: TenantStatus.ACTIVE,
    logo: null,
  };

  const tenantB = {
    id: 'tenant-sec-b',
    name: 'Bole Blades',
    slug: 'bole-blades',
    status: TenantStatus.ACTIVE,
    logo: null,
  };

  let mockUsers: Record<string, any> = {};

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const passwordHash = await bcrypt.hash('SecretPass123!', 10);

    mockUsers = {
      // 1. User with single inactive membership
      'inactive-manager@addiscuts.com': {
        id: 'user-inactive-mgr',
        email: 'inactive-manager@addiscuts.com',
        passwordHash,
        role: Role.MANAGER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-inact-1',
            userId: 'user-inactive-mgr',
            tenantId: tenantA.id,
            role: Role.MANAGER,
            isActive: false,
            tenant: tenantA,
          },
        ],
      },

      // 2. User with Tenant A inactive and Tenant B active
      'multi-tenant@barbershop.com': {
        id: 'user-multi-tenant',
        email: 'multi-tenant@barbershop.com',
        passwordHash,
        role: Role.MANAGER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: null,
        barberProfile: null,
        memberships: [
          {
            id: 'mem-multi-a',
            userId: 'user-multi-tenant',
            tenantId: tenantA.id,
            role: Role.MANAGER,
            isActive: false,
            tenant: tenantA,
          },
          {
            id: 'mem-multi-b',
            userId: 'user-multi-tenant',
            tenantId: tenantB.id,
            role: Role.MANAGER,
            isActive: true,
            tenant: tenantB,
          },
        ],
      },

      // 3. Super Admin with zero memberships
      'superadmin@bsms.com': {
        id: 'user-super-admin',
        email: 'superadmin@bsms.com',
        passwordHash,
        role: Role.SUPER_ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: null,
        barberProfile: null,
        memberships: [],
      },

      // 4. Standard active tenant user
      'active-owner@addiscuts.com': {
        id: 'user-active-owner',
        email: 'active-owner@addiscuts.com',
        passwordHash,
        role: Role.SHOP_OWNER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: {
          id: 'prof-owner-1',
          userId: 'user-active-owner',
          fullName: 'Owner Addis',
          phone: '+251911000000',
          tenantId: tenantA.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        barberProfile: null,
        memberships: [
          {
            id: 'mem-owner-1',
            userId: 'user-active-owner',
            tenantId: tenantA.id,
            role: Role.SHOP_OWNER,
            isActive: true,
            tenant: tenantA,
          },
        ],
      },
    };

    (prisma as any).tenant.findUnique = async (args: any) => {
      if (args.where?.slug === 'addis-cuts' || args.where?.id === tenantA.id) return tenantA;
      if (args.where?.slug === 'bole-blades' || args.where?.id === tenantB.id) return tenantB;
      return null;
    };

    (prisma as any).user.findUnique = async (args: any) => {
      if (args.where?.email) {
        return mockUsers[args.where.email.toLowerCase()] || null;
      }
      if (args.where?.id) {
        return Object.values(mockUsers).find((u) => u.id === args.where.id) || null;
      }
      return null;
    };
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('A. Single Inactive Membership Login Block', () => {
    it('Service Level: rejects login with 403 MEMBERSHIP_INACTIVE and issues no token', async () => {
      await assert.rejects(
        async () => {
          await AuthService.login({
            email: 'inactive-manager@addiscuts.com',
            password: 'SecretPass123!',
          });
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.code, 'MEMBERSHIP_INACTIVE');
          assert.match(err.message, /membership has been deactivated/i);
          return true;
        }
      );
    });

    it('HTTP Level: POST /api/auth/login returns 403 MEMBERSHIP_INACTIVE', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'inactive-manager@addiscuts.com',
          password: 'SecretPass123!',
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.code, 'MEMBERSHIP_INACTIVE');
      assert.strictEqual(data.data, undefined);
    });
  });

  describe('B. Requested Inactive Tenant Login Block', () => {
    it('Service Level: rejects login requesting inactive tenant with 403 NOT_TENANT_MEMBER', async () => {
      await assert.rejects(
        async () => {
          await AuthService.login(
            {
              email: 'multi-tenant@barbershop.com',
              password: 'SecretPass123!',
            },
            tenantA.id
          );
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.strictEqual(err.code, 'NOT_TENANT_MEMBER');
          assert.match(err.message, /do not have an active membership/i);
          return true;
        }
      );
    });

    it('HTTP Level: POST /api/auth/login with x-tenant-slug: addis-cuts returns 403 NOT_TENANT_MEMBER', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': 'addis-cuts',
        },
        body: JSON.stringify({
          email: 'multi-tenant@barbershop.com',
          password: 'SecretPass123!',
        }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.code, 'NOT_TENANT_MEMBER');
      assert.strictEqual(data.data, undefined);
    });
  });

  describe('C. Multi-Tenant Active Fallback', () => {
    it('Service Level: falls back exclusively to active Tenant B when no tenant is requested', async () => {
      const result = await AuthService.login({
        email: 'multi-tenant@barbershop.com',
        password: 'SecretPass123!',
      });

      assert.strictEqual(result.user.activeTenantId, tenantB.id);
      assert.strictEqual(result.user.role, Role.MANAGER);
      assert.ok(result.token);

      const decoded = jwt.verify(result.token, env.JWT_SECRET) as any;
      assert.strictEqual(decoded.tenantId, tenantB.id);
      assert.strictEqual(decoded.role, Role.MANAGER);
    });

    it('HTTP Level: POST /api/auth/login returns 200 with Tenant B active context', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'multi-tenant@barbershop.com',
          password: 'SecretPass123!',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.activeTenantId, tenantB.id);

      const decoded = jwt.verify(json.data.token, env.JWT_SECRET) as any;
      assert.strictEqual(decoded.tenantId, tenantB.id);
      assert.strictEqual(decoded.role, Role.MANAGER);
    });

    it('HTTP Level: POST /api/auth/login with x-tenant-slug: bole-blades explicitly succeeds for active tenant', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': 'bole-blades',
        },
        body: JSON.stringify({
          email: 'multi-tenant@barbershop.com',
          password: 'SecretPass123!',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.activeTenantId, tenantB.id);
    });
  });

  describe('D. GET /api/auth/me Inactive Membership Protection', () => {
    it('Service Level: getMe for single inactive membership returns activeTenantId as undefined', async () => {
      const result = await AuthService.getMe('user-inactive-mgr');
      assert.strictEqual(result.user.activeTenantId, undefined);
    });

    it('Service Level: getMe requesting inactive tenant returns activeTenantId as undefined', async () => {
      const result = await AuthService.getMe('user-multi-tenant', tenantA.id);
      assert.strictEqual(result.user.activeTenantId, undefined);
    });

    it('Service Level: getMe for multi-tenant user without tenant request resolves to active Tenant B', async () => {
      const result = await AuthService.getMe('user-multi-tenant');
      assert.strictEqual(result.user.activeTenantId, tenantB.id);
    });
  });

  describe('E. SUPER_ADMIN Login & Authentication', () => {
    it('Service Level: SUPER_ADMIN with 0 memberships logs in with role: SUPER_ADMIN and tenantId: undefined', async () => {
      const result = await AuthService.login({
        email: 'superadmin@bsms.com',
        password: 'SecretPass123!',
      });

      assert.strictEqual(result.user.role, Role.SUPER_ADMIN);
      assert.strictEqual(result.user.activeTenantId, undefined);
      assert.ok(result.token);

      const decoded = jwt.verify(result.token, env.JWT_SECRET) as any;
      assert.strictEqual(decoded.role, Role.SUPER_ADMIN);
      assert.strictEqual(decoded.tenantId, undefined);
    });

    it('HTTP Level: POST /api/auth/login succeeds for SUPER_ADMIN', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'superadmin@bsms.com',
          password: 'SecretPass123!',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, Role.SUPER_ADMIN);
      assert.strictEqual(json.data.user.activeTenantId, undefined);
    });
  });

  describe('F. Valid Tenant User Authentication', () => {
    it('Service Level: Active SHOP_OWNER logs in successfully with tenant context', async () => {
      const result = await AuthService.login({
        email: 'active-owner@addiscuts.com',
        password: 'SecretPass123!',
      });

      assert.strictEqual(result.user.role, Role.SHOP_OWNER);
      assert.strictEqual(result.user.activeTenantId, tenantA.id);
      assert.ok(result.token);

      const decoded = jwt.verify(result.token, env.JWT_SECRET) as any;
      assert.strictEqual(decoded.role, Role.SHOP_OWNER);
      assert.strictEqual(decoded.tenantId, tenantA.id);
    });

    it('HTTP Level: POST /api/auth/login succeeds for active SHOP_OWNER', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'active-owner@addiscuts.com',
          password: 'SecretPass123!',
        }),
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.user.role, Role.SHOP_OWNER);
      assert.strictEqual(json.data.user.activeTenantId, tenantA.id);
    });
  });
});
