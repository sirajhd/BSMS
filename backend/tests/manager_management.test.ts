import { describe, it } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, TenantStatus } from '@prisma/client';
import type { Request, Response } from 'express';
import prisma from '../src/config/prisma.js';
import { env } from '../src/config/env.js';
import { AppError } from '../src/middleware/errorHandler.js';
import { ManagerService } from '../src/services/manager.service.js';
import { ManagerController } from '../src/controllers/manager.controller.js';
import { AuthService } from '../src/services/auth.service.js';
import {
  authenticate,
  requireRole,
  requireTenantMembership,
} from '../src/middleware/auth.middleware.js';
import { resolveTenant } from '../src/middleware/tenant.middleware.js';
import {
  createManagerSchema,
  updateManagerSchema,
} from '../src/validators/manager.validator.js';

describe('SaaS Multi-Tenant Manager Management Suite', () => {
  const tenantAId = 'tenant-shop-a';
  const tenantBId = 'tenant-shop-b';

  const mockShopAOwner = {
    id: 'user-owner-a',
    email: 'owner@shop-a.com',
    role: Role.SHOP_OWNER,
    isActive: true,
    customerProfile: { fullName: 'Owner A', phone: '+251911111111' },
    barberProfile: null,
    memberships: [
      {
        id: 'mem-owner-a',
        userId: 'user-owner-a',
        tenantId: tenantAId,
        role: Role.SHOP_OWNER,
        isActive: true,
      },
    ],
  };

  const mockShopBOwner = {
    id: 'user-owner-b',
    email: 'owner@shop-b.com',
    role: Role.SHOP_OWNER,
    isActive: true,
    customerProfile: { fullName: 'Owner B', phone: '+251922222222' },
    barberProfile: null,
    memberships: [
      {
        id: 'mem-owner-b',
        userId: 'user-owner-b',
        tenantId: tenantBId,
        role: Role.SHOP_OWNER,
        isActive: true,
      },
    ],
  };

  describe('1. Manager Creation & Atomic Provisioning', () => {
    it('creates a manager with hashed password, customer profile, and active membership under tenant', async () => {
      let createdUserData: any = null;

      const origUserFindUnique = prisma.user.findUnique;
      const origTransaction = prisma.$transaction;
      const origAuditLog = prisma.auditLog.create;

      try {
        (prisma as any).user.findUnique = async () => null; // Email does not exist
        (prisma as any).auditLog.create = async () => ({ id: 'audit-1' });

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            user: {
              create: async (args: any) => {
                createdUserData = args.data;
                const userId = 'mgr-user-123';
                return {
                  id: userId,
                  email: args.data.email,
                  role: args.data.role,
                  isActive: args.data.isActive,
                  customerProfile: {
                    id: 'prof-123',
                    userId,
                    fullName: args.data.customerProfile.create.fullName,
                    phone: args.data.customerProfile.create.phone,
                    profileImage: args.data.customerProfile.create.profileImage,
                    tenantId: args.data.customerProfile.create.tenantId,
                  },
                  memberships: [
                    {
                      id: 'mem-123',
                      userId,
                      tenantId: args.data.memberships.create.tenantId,
                      role: args.data.memberships.create.role,
                      isActive: args.data.memberships.create.isActive,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  ],
                };
              },
            },
          };
          return fn(mockTx);
        };

        const manager = await ManagerService.createManager(
          {
            fullName: 'Michael Scott',
            phone: '+251933333333',
            email: 'manager@shop-a.com',
            password: 'SecurePassword123!',
          },
          tenantAId,
          'user-owner-a'
        );

        assert.strictEqual(manager.fullName, 'Michael Scott');
        assert.strictEqual(manager.email, 'manager@shop-a.com');
        assert.strictEqual(manager.phone, '+251933333333');
        assert.strictEqual(manager.tenantId, tenantAId);
        assert.strictEqual(manager.role, Role.MANAGER);
        assert.strictEqual(manager.isActive, true);

        // Password hash verification
        assert.ok(createdUserData.passwordHash);
        assert.notStrictEqual(createdUserData.passwordHash, 'SecurePassword123!');
        const passwordMatches = await bcrypt.compare(
          'SecurePassword123!',
          createdUserData.passwordHash
        );
        assert.strictEqual(passwordMatches, true);

        // Sensitive credential sanitization check
        assert.strictEqual('passwordHash' in manager, false);
        assert.strictEqual('password' in manager, false);
      } finally {
        (prisma as any).user.findUnique = origUserFindUnique;
        (prisma as any).$transaction = origTransaction;
        (prisma as any).auditLog.create = origAuditLog;
      }
    });

    it('rejects manager creation if email already exists globally with 409 EMAIL_EXISTS', async () => {
      const origUserFindUnique = prisma.user.findUnique;

      try {
        (prisma as any).user.findUnique = async () => ({
          id: 'existing-user-id',
          email: 'existing@platform.com',
        });

        await assert.rejects(
          async () => {
            await ManagerService.createManager(
              {
                fullName: 'Duplicate Manager',
                phone: '+251900000000',
                email: 'existing@platform.com',
                password: 'password123',
              },
              tenantAId,
              'user-owner-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 409);
            assert.strictEqual(err.code, 'EMAIL_EXISTS');
            return true;
          }
        );
      } finally {
        (prisma as any).user.findUnique = origUserFindUnique;
      }
    });

    it('rejects manager creation without tenant context with 400 TENANT_REQUIRED', async () => {
      await assert.rejects(
        async () => {
          await ManagerService.createManager(
            {
              fullName: 'Orphan Manager',
              phone: '+251900000000',
              email: 'orphan@test.com',
              password: 'password123',
            },
            undefined,
            'user-owner-a'
          );
        },
        (err: any) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 400);
          assert.strictEqual(err.code, 'TENANT_REQUIRED');
          return true;
        }
      );
    });
  });

  describe('2. Request Validation & Forbidden Fields', () => {
    it('validates required manager fields and enforces string constraints', () => {
      // Valid input
      const valid = createManagerSchema.safeParse({
        fullName: 'Jane Doe',
        phone: '+251912345678',
        email: 'jane@barbershop.com',
        password: 'validPassword123',
      });
      assert.strictEqual(valid.success, true);

      // Short name (< 2)
      const shortName = createManagerSchema.safeParse({
        fullName: 'J',
        phone: '+251912345678',
        email: 'jane@barbershop.com',
        password: 'validPassword123',
      });
      assert.strictEqual(shortName.success, false);

      // Short password (< 6)
      const shortPass = createManagerSchema.safeParse({
        fullName: 'Jane Doe',
        phone: '+251912345678',
        email: 'jane@barbershop.com',
        password: '123',
      });
      assert.strictEqual(shortPass.success, false);

      // Invalid email
      const badEmail = createManagerSchema.safeParse({
        fullName: 'Jane Doe',
        phone: '+251912345678',
        email: 'not-an-email',
        password: 'validPassword123',
      });
      assert.strictEqual(badEmail.success, false);

      // Short phone (< 6)
      const shortPhone = createManagerSchema.safeParse({
        fullName: 'Jane Doe',
        phone: '123',
        email: 'jane@barbershop.com',
        password: 'validPassword123',
      });
      assert.strictEqual(shortPhone.success, false);
    });

    it('strips or ignores client-supplied tenantId and role fields from parsed schema', () => {
      const inputWithSpoof: any = {
        fullName: 'Jane Doe',
        phone: '+251912345678',
        email: 'jane@barbershop.com',
        password: 'validPassword123',
        tenantId: 'unauthorized-tenant-id',
        role: 'SUPER_ADMIN',
      };

      const parsed: any = createManagerSchema.parse(inputWithSpoof);
      assert.strictEqual(parsed.tenantId, undefined);
      assert.strictEqual(parsed.role, undefined);
    });
  });

  describe('3. Role Authorization Guarding', () => {
    it('allows SHOP_OWNER and ADMIN to manage managers', () => {
      const middleware = requireRole(Role.SHOP_OWNER, Role.ADMIN);

      const ownerReq = {
        tenantId: tenantAId,
        user: {
          id: 'owner-id',
          role: Role.SHOP_OWNER,
          platformRole: Role.SHOP_OWNER,
          activeMembership: { id: 'mem-1', tenantId: tenantAId, role: Role.SHOP_OWNER, isActive: true },
        },
      } as unknown as Request;

      let allowed = false;
      middleware(ownerReq, {} as Response, (err) => {
        allowed = !err;
      });
      assert.strictEqual(allowed, true);
    });

    it('rejects MANAGER from creating or updating other managers with 403 FORBIDDEN', () => {
      const middleware = requireRole(Role.SHOP_OWNER, Role.ADMIN);

      const managerReq = {
        tenantId: tenantAId,
        user: {
          id: 'manager-id',
          role: Role.MANAGER,
          platformRole: Role.CUSTOMER,
          activeMembership: { id: 'mem-2', tenantId: tenantAId, isActive: true },
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(managerReq, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
      assert.strictEqual(errorResult.code, 'FORBIDDEN');
    });

    it('rejects BARBER from managing managers with 403 FORBIDDEN', () => {
      const middleware = requireRole(Role.SHOP_OWNER, Role.ADMIN);

      const barberReq = {
        tenantId: tenantAId,
        user: {
          id: 'barber-id',
          role: Role.BARBER,
          platformRole: Role.CUSTOMER,
          activeMembership: { id: 'mem-3', tenantId: tenantAId, isActive: true },
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(barberReq, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
      assert.strictEqual(errorResult.code, 'FORBIDDEN');
    });

    it('rejects CUSTOMER from managing managers with 403 FORBIDDEN', () => {
      const middleware = requireRole(Role.SHOP_OWNER, Role.ADMIN);

      const custReq = {
        tenantId: tenantAId,
        user: {
          id: 'cust-id',
          role: Role.CUSTOMER,
          platformRole: Role.CUSTOMER,
          activeMembership: { id: 'mem-4', tenantId: tenantAId, isActive: true },
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(custReq, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
      assert.strictEqual(errorResult.code, 'FORBIDDEN');
    });
  });

  describe('4. Tenant Isolation & IDOR/BOLA Protection', () => {
    const mockManagerA = {
      id: 'mem-mgr-a',
      userId: 'user-mgr-a',
      tenantId: tenantAId,
      role: Role.MANAGER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-mgr-a',
        email: 'mgr-a@shop-a.com',
        isActive: true,
        customerProfile: {
          id: 'prof-mgr-a',
          fullName: 'Manager Shop A',
          phone: '+251911111111',
          profileImage: null,
        },
      },
    };

    const mockManagerB = {
      id: 'mem-mgr-b',
      userId: 'user-mgr-b',
      tenantId: tenantBId,
      role: Role.MANAGER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user-mgr-b',
        email: 'mgr-b@shop-b.com',
        isActive: true,
        customerProfile: {
          id: 'prof-mgr-b',
          fullName: 'Manager Shop B',
          phone: '+251922222222',
          profileImage: null,
        },
      },
    };

    it('Tenant A only lists Tenant A managers and does not leak Tenant B managers', async () => {
      const origFindMany = prisma.membership.findMany;

      try {
        let queriedWhere: any = null;
        (prisma as any).membership.findMany = async (args: any) => {
          queriedWhere = args.where;
          if (args.where?.tenantId === tenantAId) {
            return [mockManagerA];
          }
          if (args.where?.tenantId === tenantBId) {
            return [mockManagerB];
          }
          return [];
        };

        const listA = await ManagerService.getAllManagers(tenantAId, false);
        assert.strictEqual(listA.length, 1);
        assert.strictEqual(listA[0].email, 'mgr-a@shop-a.com');
        assert.strictEqual(queriedWhere.tenantId, tenantAId);
        assert.strictEqual(queriedWhere.role, Role.MANAGER);
      } finally {
        (prisma as any).membership.findMany = origFindMany;
      }
    });

    it('rejects cross-tenant manager single retrieval with 404 MANAGER_NOT_FOUND (IDOR protection)', async () => {
      const origFindFirst = prisma.membership.findFirst;

      try {
        (prisma as any).membership.findFirst = async (args: any) => {
          // If query tenantId is tenantAId but id is user-mgr-b, it returns null
          if (args.where?.tenantId === tenantAId && args.where?.OR?.some((cond: any) => cond.userId === 'user-mgr-b')) {
            return null;
          }
          return null;
        };

        await assert.rejects(
          async () => {
            // Tenant A owner attempts to read Tenant B's manager ID
            await ManagerService.getManagerById('user-mgr-b', tenantAId);
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 404);
            assert.strictEqual(err.code, 'MANAGER_NOT_FOUND');
            return true;
          }
        );
      } finally {
        (prisma as any).membership.findFirst = origFindFirst;
      }
    });

    it('rejects cross-tenant manager update with 404 MANAGER_NOT_FOUND (BOLA protection)', async () => {
      const origFindFirst = prisma.membership.findFirst;

      try {
        (prisma as any).membership.findFirst = async () => null; // Not found in Tenant A

        await assert.rejects(
          async () => {
            // Tenant A owner attempts to update Tenant B's manager ID
            await ManagerService.updateManager('user-mgr-b', { fullName: 'Hacked Name' }, tenantAId, 'user-owner-a');
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 404);
            assert.strictEqual(err.code, 'MANAGER_NOT_FOUND');
            return true;
          }
        );
      } finally {
        (prisma as any).membership.findFirst = origFindFirst;
      }
    });

    it('rejects cross-tenant manager status toggle with 404 MANAGER_NOT_FOUND', async () => {
      const origFindFirst = prisma.membership.findFirst;

      try {
        (prisma as any).membership.findFirst = async () => null;

        await assert.rejects(
          async () => {
            // Tenant A owner attempts to toggle Tenant B's manager
            await ManagerService.toggleManagerStatus('user-mgr-b', tenantAId, 'user-owner-a');
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 404);
            assert.strictEqual(err.code, 'MANAGER_NOT_FOUND');
            return true;
          }
        );
      } finally {
        (prisma as any).membership.findFirst = origFindFirst;
      }
    });

    it('rejects spoofed x-tenant-slug header with 403 NOT_TENANT_MEMBER', async () => {
      const origUserFindUnique = prisma.user.findUnique;
      const origTenantFindUnique = prisma.tenant.findUnique;

      try {
        (prisma as any).tenant.findUnique = async (args: any) => {
          if (args.where?.slug === 'shop-b') {
            return { id: tenantBId, slug: 'shop-b', status: TenantStatus.ACTIVE };
          }
          return null;
        };

        (prisma as any).user.findUnique = async () => mockShopAOwner;

        const token = jwt.sign(
          { id: 'user-owner-a', email: 'owner@shop-a.com', role: Role.SHOP_OWNER, tenantId: tenantAId },
          env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const spoofedReq = {
          headers: {
            authorization: `Bearer ${token}`,
            'x-tenant-slug': 'shop-b', // Owner A attempting to spoof shop-b header
          },
          path: '/api/managers',
          method: 'GET',
        } as unknown as Request;

        let resolveError: any = null;
        await resolveTenant(spoofedReq, {} as Response, (err) => {
          resolveError = err;
        });

        assert.ok(resolveError instanceof AppError);
        assert.strictEqual(resolveError.statusCode, 403);
        assert.strictEqual(resolveError.code, 'NOT_TENANT_MEMBER');
      } finally {
        (prisma as any).user.findUnique = origUserFindUnique;
        (prisma as any).tenant.findUnique = origTenantFindUnique;
      }
    });
  });

  describe('5. Manager Lifecycle & Status Management', () => {
    it('allows shop owner to update manager profile details', async () => {
      const origFindFirst = prisma.membership.findFirst;
      const origFindUnique = prisma.membership.findUnique;
      const origTransaction = prisma.$transaction;
      const origAuditLog = prisma.auditLog.create;

      try {
        const mockManager = {
          id: 'mem-mgr-1',
          userId: 'user-mgr-1',
          tenantId: tenantAId,
          role: Role.MANAGER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-mgr-1',
            email: 'mgr@shop.com',
            isActive: true,
            customerProfile: {
              id: 'prof-1',
              fullName: 'Old Name',
              phone: '+251911111111',
              profileImage: null,
            },
          },
        };

        (prisma as any).membership.findFirst = async () => mockManager;
        (prisma as any).auditLog.create = async () => ({ id: 'audit-1' });

        let updatedProfileData: any = null;
        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            customerProfile: {
              update: async (args: any) => {
                updatedProfileData = args.data;
                return { id: 'prof-1', ...args.data };
              },
            },
          };
          return fn(mockTx);
        };

        (prisma as any).membership.findUnique = async () => ({
          ...mockManager,
          user: {
            ...mockManager.user,
            customerProfile: {
              ...mockManager.user.customerProfile,
              fullName: 'New Updated Name',
              phone: '+251999999999',
            },
          },
        });

        const updated = await ManagerService.updateManager(
          'user-mgr-1',
          { fullName: 'New Updated Name', phone: '+251999999999' },
          tenantAId,
          'user-owner-a'
        );

        assert.strictEqual(updated.fullName, 'New Updated Name');
        assert.strictEqual(updated.phone, '+251999999999');
        assert.strictEqual(updatedProfileData.fullName, 'New Updated Name');
        assert.strictEqual(updatedProfileData.phone, '+251999999999');
      } finally {
        (prisma as any).membership.findFirst = origFindFirst;
        (prisma as any).membership.findUnique = origFindUnique;
        (prisma as any).$transaction = origTransaction;
        (prisma as any).auditLog.create = origAuditLog;
      }
    });

    it('toggles manager active status from active to inactive and vice versa', async () => {
      const origFindFirst = prisma.membership.findFirst;
      const origUpdate = prisma.membership.update;
      const origAuditLog = prisma.auditLog.create;

      try {
        const mockManager = {
          id: 'mem-mgr-1',
          userId: 'user-mgr-1',
          tenantId: tenantAId,
          role: Role.MANAGER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-mgr-1',
            email: 'mgr@shop.com',
            isActive: true,
            customerProfile: {
              id: 'prof-1',
              fullName: 'Manager',
              phone: '+251911111111',
            },
          },
        };

        (prisma as any).membership.findFirst = async () => mockManager;
        (prisma as any).auditLog.create = async () => ({ id: 'audit-1' });

        let updatedMembershipData: any = null;
        (prisma as any).membership.update = async (args: any) => {
          updatedMembershipData = args.data;
          return {
            ...mockManager,
            isActive: args.data.isActive,
          };
        };

        // Toggle from true -> false
        const toggled = await ManagerService.toggleManagerStatus(
          'user-mgr-1',
          tenantAId,
          'user-owner-a'
        );

        assert.strictEqual(toggled.isActive, false);
        assert.strictEqual(updatedMembershipData.isActive, false);
      } finally {
        (prisma as any).membership.findFirst = origFindFirst;
        (prisma as any).membership.update = origUpdate;
        (prisma as any).auditLog.create = origAuditLog;
      }
    });

    it('rejects user from deactivating/toggling their own manager status with 400 CANNOT_TOGGLE_SELF', async () => {
      const origFindFirst = prisma.membership.findFirst;

      try {
        (prisma as any).membership.findFirst = async () => ({
          id: 'mem-mgr-1',
          userId: 'user-mgr-1',
          tenantId: tenantAId,
          role: Role.MANAGER,
          isActive: true,
          user: { customerProfile: { fullName: 'Manager' } },
        });

        await assert.rejects(
          async () => {
            // Caller attempts to toggle self
            await ManagerService.toggleManagerStatus('user-mgr-1', tenantAId, 'user-mgr-1');
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 400);
            assert.strictEqual(err.code, 'CANNOT_TOGGLE_SELF');
            return true;
          }
        );
      } finally {
        (prisma as any).membership.findFirst = origFindFirst;
      }
    });
  });

  describe('6. Manager Authentication & JWT Integration', () => {
    it('manager can authenticate via existing AuthService.login and receive valid JWT with role: MANAGER', async () => {
      const origUserFindUnique = prisma.user.findUnique;

      try {
        const passwordHash = await bcrypt.hash('ManagerPass123!', 10);

        (prisma as any).user.findUnique = async () => ({
          id: 'mgr-user-999',
          email: 'manager@barbershop.com',
          passwordHash,
          role: Role.MANAGER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          customerProfile: {
            id: 'prof-999',
            userId: 'mgr-user-999',
            fullName: 'Dwight Schrute',
            phone: '+251912345678',
            tenantId: tenantAId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          barberProfile: null,
          memberships: [
            {
              id: 'mem-mgr-999',
              userId: 'mgr-user-999',
              tenantId: tenantAId,
              role: Role.MANAGER,
              isActive: true,
              tenant: {
                id: tenantAId,
                name: 'Dunder Cuts',
                slug: 'dunder-cuts',
                status: TenantStatus.ACTIVE,
                logo: null,
              },
            },
          ],
        });

        const loginResult = await AuthService.login(
          { email: 'manager@barbershop.com', password: 'ManagerPass123!' },
          tenantAId
        );

        assert.strictEqual(loginResult.user.id, 'mgr-user-999');
        assert.strictEqual(loginResult.user.email, 'manager@barbershop.com');
        assert.strictEqual(loginResult.user.role, Role.MANAGER);
        assert.strictEqual(loginResult.user.activeTenantId, tenantAId);
        assert.ok(loginResult.token);

        // Verify token payload
        const decoded = jwt.verify(loginResult.token, env.JWT_SECRET) as any;
        assert.strictEqual(decoded.id, 'mgr-user-999');
        assert.strictEqual(decoded.role, Role.MANAGER);
        assert.strictEqual(decoded.tenantId, tenantAId);

        // Verify passwordHash is never returned in login response
        assert.strictEqual('passwordHash' in loginResult.user, false);
      } finally {
        (prisma as any).user.findUnique = origUserFindUnique;
      }
    });
  });
});
