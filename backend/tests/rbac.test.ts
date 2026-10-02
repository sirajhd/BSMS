import { describe, it } from 'node:test';
import assert from 'node:assert';
import { requireRole } from '../src/middleware/auth.middleware.js';
import { AppError } from '../src/middleware/errorHandler.js';
import { Role } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

describe('RBAC & Security Authorization Tests', () => {
  it('allows access when user has the required role', () => {
    const middleware = requireRole(Role.ADMIN);
    const mockReq = {
      user: {
        id: 'admin-1',
        email: 'admin@barbershop.com',
        role: Role.ADMIN,
      },
    } as unknown as Request;
    const mockRes = {} as Response;

    let calledNext = false;
    let nextError: any = null;

    const mockNext: NextFunction = (err?: any) => {
      calledNext = true;
      nextError = err;
    };

    middleware(mockReq, mockRes, mockNext);

    assert.strictEqual(calledNext, true);
    assert.strictEqual(nextError, undefined);
  });

  it('rejects CUSTOMER role from accessing ADMIN-only endpoints with 403 Forbidden', () => {
    const middleware = requireRole(Role.ADMIN);
    const mockReq = {
      user: {
        id: 'cust-1',
        email: 'cust@barbershop.com',
        role: Role.CUSTOMER,
      },
    } as unknown as Request;
    const mockRes = {} as Response;

    let nextError: any = null;
    const mockNext: NextFunction = (err?: any) => {
      nextError = err;
    };

    middleware(mockReq, mockRes, mockNext);

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.code, 'FORBIDDEN');
  });

  it('rejects BARBER role from accessing ADMIN-only endpoints with 403 Forbidden', () => {
    const middleware = requireRole(Role.ADMIN);
    const mockReq = {
      user: {
        id: 'barb-1',
        email: 'barb@barbershop.com',
        role: Role.BARBER,
      },
    } as unknown as Request;
    const mockRes = {} as Response;

    let nextError: any = null;
    const mockNext: NextFunction = (err?: any) => {
      nextError = err;
    };

    middleware(mockReq, mockRes, mockNext);

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 403);
    assert.strictEqual(nextError.code, 'FORBIDDEN');
  });

  it('allows multi-role permitted endpoints for BARBER and ADMIN but rejects CUSTOMER', () => {
    const middleware = requireRole(Role.ADMIN, Role.BARBER);

    // Test BARBER
    const barbReq = {
      user: { id: 'barb-1', email: 'barb@barbershop.com', role: Role.BARBER },
    } as unknown as Request;
    let barbNextCalled = false;
    middleware(barbReq, {} as Response, (err) => {
      barbNextCalled = !err;
    });
    assert.strictEqual(barbNextCalled, true);

    // Test ADMIN
    const adminReq = {
      user: { id: 'admin-1', email: 'admin@barbershop.com', role: Role.ADMIN },
    } as unknown as Request;
    let adminNextCalled = false;
    middleware(adminReq, {} as Response, (err) => {
      adminNextCalled = !err;
    });
    assert.strictEqual(adminNextCalled, true);

    // Test CUSTOMER
    const custReq = {
      user: { id: 'cust-1', email: 'cust@barbershop.com', role: Role.CUSTOMER },
    } as unknown as Request;
    let custError: any = null;
    middleware(custReq, {} as Response, (err) => {
      custError = err;
    });
    assert.ok(custError instanceof AppError);
    assert.strictEqual(custError.statusCode, 403);
  });

  it('rejects unauthenticated request with 401 Unauthorized', () => {
    const middleware = requireRole(Role.ADMIN);
    const mockReq = {} as Request; // No user attached

    let nextError: any = null;
    middleware(mockReq, {} as Response, (err) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.strictEqual(nextError.statusCode, 401);
    assert.strictEqual(nextError.code, 'UNAUTHORIZED');
  });
});
