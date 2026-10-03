import { describe, it } from 'node:test';
import assert from 'node:assert';
import { requireRole, requireSuperAdmin } from '../src/middleware/auth.middleware.js';
import { AppError } from '../src/middleware/errorHandler.js';
import { Role } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

describe('SaaS Multi-Tenant RBAC & Isolation Security Tests', () => {
  it('permits SUPER_ADMIN on any administrative action across tenants', () => {
    const middleware = requireRole(Role.SHOP_OWNER, Role.ADMIN);
    const mockReq = {
      user: {
        id: 'super-1',
        email: 'superadmin@bsms.com',
        role: Role.SUPER_ADMIN,
        platformRole: Role.SUPER_ADMIN,
        memberships: [],
      },
    } as unknown as Request;

    let nextCalled = false;
    middleware(mockReq, {} as Response, (err) => {
      nextCalled = !err;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('permits SUPER_ADMIN on platform-exclusive endpoints', () => {
    const middleware = requireSuperAdmin;
    const mockReq = {
      user: {
        id: 'super-1',
        email: 'superadmin@bsms.com',
        role: Role.SUPER_ADMIN,
        platformRole: Role.SUPER_ADMIN,
        memberships: [],
      },
    } as unknown as Request;

    let nextCalled = false;
    middleware(mockReq, {} as Response, (err) => {
      nextCalled = !err;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('rejects SHOP_OWNER from accessing platform-exclusive endpoints with 403', () => {
    const middleware = requireSuperAdmin;
    const mockReq = {
      user: {
        id: 'owner-1',
        email: 'owner@barbershop.com',
        role: Role.SHOP_OWNER,
        platformRole: Role.CUSTOMER,
        memberships: [{ tenantId: 'tenant-a', role: Role.SHOP_OWNER, isActive: true }],
      },
    } as unknown as Request;

    let nextError: any = null;
    middleware(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.code, 'SUPER_ADMIN_REQUIRED');
  });

  it('rejects MANAGER from accessing platform-exclusive endpoints with 403', () => {
    const middleware = requireSuperAdmin;
    const mockReq = {
      user: {
        id: 'mgr-1',
        email: 'manager@barbershop.com',
        role: Role.MANAGER,
        platformRole: Role.CUSTOMER,
        memberships: [{ tenantId: 'tenant-a', role: Role.MANAGER, isActive: true }],
      },
    } as unknown as Request;

    let nextError: any = null;
    middleware(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
  });

  it('allows SHOP_OWNER and MANAGER for shop operations but rejects CUSTOMER', () => {
    const middleware = requireRole(Role.SHOP_OWNER, Role.MANAGER);

    // SHOP_OWNER
    const ownerReq = {
      user: { id: 'o-1', email: 'owner@shop.com', role: Role.SHOP_OWNER, platformRole: Role.CUSTOMER },
    } as unknown as Request;
    let ownerNext = false;
    middleware(ownerReq, {} as Response, (err) => {
      ownerNext = !err;
    });
    assert.strictEqual(ownerNext, true);

    // MANAGER
    const mgrReq = {
      user: { id: 'm-1', email: 'mgr@shop.com', role: Role.MANAGER, platformRole: Role.CUSTOMER },
    } as unknown as Request;
    let mgrNext = false;
    middleware(mgrReq, {} as Response, (err) => {
      mgrNext = !err;
    });
    assert.strictEqual(mgrNext, true);

    // CUSTOMER -> Rejected
    const custReq = {
      user: { id: 'c-1', email: 'cust@shop.com', role: Role.CUSTOMER, platformRole: Role.CUSTOMER },
    } as unknown as Request;
    let custError: any = null;
    middleware(custReq, {} as Response, (err) => {
      custError = err;
    });
    assert.ok(custError instanceof AppError);
    assert.strictEqual(custError.statusCode, 403);
  });

  it('rejects BARBER role from accessing Shop Owner settings with 403 Forbidden', () => {
    const middleware = requireRole(Role.SHOP_OWNER);
    const mockReq = {
      user: {
        id: 'barb-1',
        email: 'barber@shop.com',
        role: Role.BARBER,
        platformRole: Role.CUSTOMER,
      },
    } as unknown as Request;

    let nextError: any = null;
    middleware(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
  });
});
