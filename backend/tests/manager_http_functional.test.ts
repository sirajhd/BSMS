import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { createApp } from '../src/app.js';
import prisma from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import { Role, TenantStatus } from '@prisma/client';

describe('HTTP Functional Testing: Manager Management Endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  const tenantA = {
    id: 'tenant-http-a',
    name: 'Addis Cuts',
    slug: 'addis-cuts',
    status: TenantStatus.ACTIVE,
  };

  const tenantB = {
    id: 'tenant-http-b',
    name: 'Bole Blades',
    slug: 'bole-blades',
    status: TenantStatus.ACTIVE,
  };

  let ownerAToken = '';
  let ownerBToken = '';
  let managerAToken = '';
  let barberAToken = '';
  let customerAToken = '';

  let createdManagerId = '';

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

    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    // Mock User queries in Prisma for HTTP test runner
    (prisma as any).tenant.findUnique = async (args: any) => {
      if (args.where?.slug === 'addis-cuts' || args.where?.id === 'tenant-http-a') return tenantA;
      if (args.where?.slug === 'bole-blades' || args.where?.id === 'tenant-http-b') return tenantB;
      return null;
    };

    const mockUsers: Record<string, any> = {
      'owner-a@addiscuts.com': {
        id: 'user-owner-a',
        email: 'owner-a@addiscuts.com',
        passwordHash,
        role: Role.SHOP_OWNER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: { id: 'prof-owner-a', fullName: 'Owner Addis', phone: '+251911111111', tenantId: tenantA.id, createdAt: new Date(), updatedAt: new Date() },
        barberProfile: null,
        memberships: [{ id: 'mem-oa', userId: 'user-owner-a', tenantId: tenantA.id, role: Role.SHOP_OWNER, isActive: true, tenant: tenantA }],
      },
      'owner-b@boleblades.com': {
        id: 'user-owner-b',
        email: 'owner-b@boleblades.com',
        passwordHash,
        role: Role.SHOP_OWNER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: { id: 'prof-owner-b', fullName: 'Owner Bole', phone: '+251922222222', tenantId: tenantB.id, createdAt: new Date(), updatedAt: new Date() },
        barberProfile: null,
        memberships: [{ id: 'mem-ob', userId: 'user-owner-b', tenantId: tenantB.id, role: Role.SHOP_OWNER, isActive: true, tenant: tenantB }],
      },
      'manager-a@addiscuts.com': {
        id: 'user-mgr-a',
        email: 'manager-a@addiscuts.com',
        passwordHash,
        role: Role.MANAGER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: { id: 'prof-mgr-a', fullName: 'Manager Addis', phone: '+251933333333', tenantId: tenantA.id, createdAt: new Date(), updatedAt: new Date() },
        barberProfile: null,
        memberships: [{ id: 'mem-ma', userId: 'user-mgr-a', tenantId: tenantA.id, role: Role.MANAGER, isActive: true, tenant: tenantA }],
      },
      'barber-a@addiscuts.com': {
        id: 'user-barb-a',
        email: 'barber-a@addiscuts.com',
        passwordHash,
        role: Role.BARBER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: null,
        barberProfile: { id: 'barb-prof-a', fullName: 'Barber Addis', phone: '+251944444444', tenantId: tenantA.id, createdAt: new Date(), updatedAt: new Date() },
        memberships: [{ id: 'mem-ba', userId: 'user-barb-a', tenantId: tenantA.id, role: Role.BARBER, isActive: true, tenant: tenantA }],
      },
      'customer-a@addiscuts.com': {
        id: 'user-cust-a',
        email: 'customer-a@addiscuts.com',
        passwordHash,
        role: Role.CUSTOMER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customerProfile: { id: 'prof-cust-a', fullName: 'Customer Addis', phone: '+251955555555', tenantId: tenantA.id, createdAt: new Date(), updatedAt: new Date() },
        barberProfile: null,
        memberships: [{ id: 'mem-ca', userId: 'user-cust-a', tenantId: tenantA.id, role: Role.CUSTOMER, isActive: true, tenant: tenantA }],
      },
    };

    (prisma as any).user.findUnique = async (args: any) => {
      if (args.where?.email) return mockUsers[args.where.email] || null;
      if (args.where?.id) {
        return Object.values(mockUsers).find((u: any) => u.id === args.where.id) || null;
      }
      return null;
    };
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. HTTP POST /api/auth/login: Owner A logs in successfully', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-slug': 'addis-cuts' },
      body: JSON.stringify({ email: 'owner-a@addiscuts.com', password: 'TestPassword123!' }),
    });

    const body: any = await res.json();
    if (res.status !== 200) {
      console.error('Login error body:', body);
    }
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data?.token);
    assert.strictEqual(body.data.user.role, Role.SHOP_OWNER);
    assert.strictEqual('passwordHash' in body.data.user, false);
    ownerAToken = body.data.token;
  });

  it('2. HTTP POST /api/auth/login: Owner B, Manager A, Barber A, Customer A log in', async () => {
    const resB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-slug': 'bole-blades' },
      body: JSON.stringify({ email: 'owner-b@boleblades.com', password: 'TestPassword123!' }),
    });
    ownerBToken = (await resB.json() as any).data.token;

    const resM = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-slug': 'addis-cuts' },
      body: JSON.stringify({ email: 'manager-a@addiscuts.com', password: 'TestPassword123!' }),
    });
    managerAToken = (await resM.json() as any).data.token;

    const resBarb = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-slug': 'addis-cuts' },
      body: JSON.stringify({ email: 'barber-a@addiscuts.com', password: 'TestPassword123!' }),
    });
    barberAToken = (await resBarb.json() as any).data.token;

    const resCust = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tenant-slug': 'addis-cuts' },
      body: JSON.stringify({ email: 'customer-a@addiscuts.com', password: 'TestPassword123!' }),
    });
    customerAToken = (await resCust.json() as any).data.token;

    assert.ok(ownerBToken && managerAToken && barberAToken && customerAToken);
  });

  it('3. HTTP POST /api/managers: Owner A creates a new manager (HTTP 201)', async () => {
    const origTx = prisma.$transaction;
    const origAuditLog = prisma.auditLog.create;

    try {
      (prisma as any).auditLog.create = async () => ({ id: 'audit-1' });
      (prisma as any).$transaction = async (fn: any) => {
        const mockTx = {
          user: {
            create: async (args: any) => ({
              id: 'user-new-mgr-1',
              email: args.data.email,
              role: Role.MANAGER,
              isActive: true,
              customerProfile: {
                id: 'prof-new-mgr-1',
                userId: 'user-new-mgr-1',
                fullName: args.data.customerProfile.create.fullName,
                phone: args.data.customerProfile.create.phone,
                profileImage: null,
                tenantId: args.data.customerProfile.create.tenantId,
              },
              memberships: [
                {
                  id: 'mem-new-mgr-1',
                  userId: 'user-new-mgr-1',
                  tenantId: args.data.memberships.create.tenantId,
                  role: Role.MANAGER,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            }),
          },
        };
        return fn(mockTx);
      };

      const res = await fetch(`${baseUrl}/api/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerAToken}`,
          'x-tenant-slug': 'addis-cuts',
        },
        body: JSON.stringify({
          fullName: 'Tewodros Kassahun',
          phone: '+251911223344',
          email: 'teddy@addiscuts.com',
          password: 'TemporaryPass123!',
        }),
      });

      assert.strictEqual(res.status, 201);
      const body: any = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.fullName, 'Tewodros Kassahun');
      assert.strictEqual(body.data.email, 'teddy@addiscuts.com');
      assert.strictEqual(body.data.role, Role.MANAGER);
      assert.strictEqual(body.data.tenantId, tenantA.id);
      assert.strictEqual('passwordHash' in body.data, false);
      assert.strictEqual('password' in body.data, false);

      createdManagerId = body.data.id;
    } finally {
      (prisma as any).$transaction = origTx;
      (prisma as any).auditLog.create = origAuditLog;
    }
  });

  it('4. HTTP GET /api/managers: Owner A lists managers (HTTP 200)', async () => {
    const origFindMany = prisma.membership.findMany;

    try {
      (prisma as any).membership.findMany = async () => [
        {
          id: 'mem-new-mgr-1',
          userId: 'user-new-mgr-1',
          tenantId: tenantA.id,
          role: Role.MANAGER,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-new-mgr-1',
            email: 'teddy@addiscuts.com',
            isActive: true,
            customerProfile: {
              id: 'prof-new-mgr-1',
              fullName: 'Tewodros Kassahun',
              phone: '+251911223344',
              profileImage: null,
            },
          },
        },
      ];

      const res = await fetch(`${baseUrl}/api/managers`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ownerAToken}`,
          'x-tenant-slug': 'addis-cuts',
        },
      });

      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.length, 1);
      assert.strictEqual(body.data[0].email, 'teddy@addiscuts.com');
      assert.strictEqual('passwordHash' in body.data[0], false);
    } finally {
      (prisma as any).membership.findMany = origFindMany;
    }
  });

  it('5. HTTP GET /api/managers/:id: Owner A reads manager details (HTTP 200)', async () => {
    const origFindFirst = prisma.membership.findFirst;

    try {
      (prisma as any).membership.findFirst = async () => ({
        id: 'mem-new-mgr-1',
        userId: 'user-new-mgr-1',
        tenantId: tenantA.id,
        role: Role.MANAGER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-new-mgr-1',
          email: 'teddy@addiscuts.com',
          isActive: true,
          customerProfile: {
            id: 'prof-new-mgr-1',
            fullName: 'Tewodros Kassahun',
            phone: '+251911223344',
            profileImage: null,
          },
        },
      });

      const res = await fetch(`${baseUrl}/api/managers/user-new-mgr-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ownerAToken}`,
          'x-tenant-slug': 'addis-cuts',
        },
      });

      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, 'user-new-mgr-1');
      assert.strictEqual(body.data.fullName, 'Tewodros Kassahun');
    } finally {
      (prisma as any).membership.findFirst = origFindFirst;
    }
  });

  it('6. HTTP PATCH /api/managers/:id: Owner A updates manager (HTTP 200)', async () => {
    const origFindFirst = prisma.membership.findFirst;
    const origFindUnique = prisma.membership.findUnique;
    const origTx = prisma.$transaction;
    const origAudit = prisma.auditLog.create;

    try {
      (prisma as any).membership.findFirst = async () => ({
        id: 'mem-new-mgr-1',
        userId: 'user-new-mgr-1',
        tenantId: tenantA.id,
        role: Role.MANAGER,
        isActive: true,
        user: {
          customerProfile: {
            id: 'prof-new-mgr-1',
            fullName: 'Old Name',
            phone: '+251911223344',
          },
        },
      });

      (prisma as any).$transaction = async (fn: any) => {
        const mockTx = {
          customerProfile: { update: async () => ({ id: 'prof-new-mgr-1' }) },
        };
        return fn(mockTx);
      };

      (prisma as any).membership.findUnique = async () => ({
        id: 'mem-new-mgr-1',
        userId: 'user-new-mgr-1',
        tenantId: tenantA.id,
        role: Role.MANAGER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-new-mgr-1',
          email: 'teddy@addiscuts.com',
          isActive: true,
          customerProfile: {
            id: 'prof-new-mgr-1',
            fullName: 'Teddy Afro',
            phone: '+251999887766',
            profileImage: null,
          },
        },
      });

      (prisma as any).auditLog.create = async () => ({ id: 'audit-1' });

      const res = await fetch(`${baseUrl}/api/managers/user-new-mgr-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerAToken}`,
          'x-tenant-slug': 'addis-cuts',
        },
        body: JSON.stringify({ fullName: 'Teddy Afro', phone: '+251999887766' }),
      });

      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.fullName, 'Teddy Afro');
      assert.strictEqual(body.data.phone, '+251999887766');
    } finally {
      (prisma as any).membership.findFirst = origFindFirst;
      (prisma as any).membership.findUnique = origFindUnique;
      (prisma as any).$transaction = origTx;
      (prisma as any).auditLog.create = origAudit;
    }
  });

  it('7. HTTP PATCH /api/managers/:id/toggle-status: Owner A toggles manager status (HTTP 200)', async () => {
    const origFindFirst = prisma.membership.findFirst;
    const origUpdate = prisma.membership.update;
    const origAudit = prisma.auditLog.create;

    try {
      (prisma as any).membership.findFirst = async () => ({
        id: 'mem-new-mgr-1',
        userId: 'user-new-mgr-1',
        tenantId: tenantA.id,
        role: Role.MANAGER,
        isActive: true,
        user: { customerProfile: { fullName: 'Teddy Afro' } },
      });

      (prisma as any).membership.update = async (args: any) => ({
        id: 'mem-new-mgr-1',
        userId: 'user-new-mgr-1',
        tenantId: tenantA.id,
        role: Role.MANAGER,
        isActive: args.data.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-new-mgr-1',
          email: 'teddy@addiscuts.com',
          isActive: true,
          customerProfile: {
            id: 'prof-new-mgr-1',
            fullName: 'Teddy Afro',
            phone: '+251999887766',
            profileImage: null,
          },
        },
      });

      (prisma as any).auditLog.create = async () => ({ id: 'audit-1' });

      const res = await fetch(`${baseUrl}/api/managers/user-new-mgr-1/toggle-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerAToken}`,
          'x-tenant-slug': 'addis-cuts',
        },
      });

      assert.strictEqual(res.status, 200);
      const body: any = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.isActive, false);
    } finally {
      (prisma as any).membership.findFirst = origFindFirst;
      (prisma as any).membership.update = origUpdate;
      (prisma as any).auditLog.create = origAudit;
    }
  });

  it('8. Cross-Tenant IDOR: Owner B cannot read or modify Owner A manager (HTTP 404)', async () => {
    const origFindFirst = prisma.membership.findFirst;

    try {
      (prisma as any).membership.findFirst = async () => null; // Returns null for Tenant B

      // Read attempt
      const getRes = await fetch(`${baseUrl}/api/managers/user-new-mgr-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ownerBToken}`,
          'x-tenant-slug': 'bole-blades',
        },
      });
      assert.strictEqual(getRes.status, 404);
      const getBody: any = await getRes.json();
      assert.strictEqual(getBody.code, 'MANAGER_NOT_FOUND');

      // Update attempt
      const patchRes = await fetch(`${baseUrl}/api/managers/user-new-mgr-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerBToken}`,
          'x-tenant-slug': 'bole-blades',
        },
        body: JSON.stringify({ fullName: 'Malicious Edit' }),
      });
      assert.strictEqual(patchRes.status, 404);

      // Toggle attempt
      const toggleRes = await fetch(`${baseUrl}/api/managers/user-new-mgr-1/toggle-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ownerBToken}`,
          'x-tenant-slug': 'bole-blades',
        },
      });
      assert.strictEqual(toggleRes.status, 404);
    } finally {
      (prisma as any).membership.findFirst = origFindFirst;
    }
  });

  it('9. Cross-Tenant Spoofing: Owner A sending x-tenant-slug: bole-blades is rejected (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/api/managers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ownerAToken}`,
        'x-tenant-slug': 'bole-blades', // Spoofed header
      },
    });

    assert.strictEqual(res.status, 403);
    const body: any = await res.json();
    assert.strictEqual(body.code, 'NOT_TENANT_MEMBER');
  });

  it('10. Authorization Guard: MANAGER, BARBER, CUSTOMER cannot manage managers (HTTP 403)', async () => {
    // Manager attempting to manage managers
    const resM = await fetch(`${baseUrl}/api/managers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerAToken}`,
        'x-tenant-slug': 'addis-cuts',
      },
      body: JSON.stringify({ fullName: 'Sub Manager', phone: '+251911111111', email: 'sub@shop.com', password: 'password123' }),
    });
    assert.strictEqual(resM.status, 403);

    // Barber attempting to manage managers
    const resB = await fetch(`${baseUrl}/api/managers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${barberAToken}`,
        'x-tenant-slug': 'addis-cuts',
      },
    });
    assert.strictEqual(resB.status, 403);

    // Customer attempting to manage managers
    const resC = await fetch(`${baseUrl}/api/managers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${customerAToken}`,
        'x-tenant-slug': 'addis-cuts',
      },
    });
    assert.strictEqual(resC.status, 403);
  });

  it('11. Unauthenticated request is rejected (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/managers`, {
      method: 'GET',
      headers: {
        'x-tenant-slug': 'addis-cuts',
      },
    });

    assert.strictEqual(res.status, 401);
  });
});
