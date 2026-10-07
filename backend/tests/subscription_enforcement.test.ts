import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SubscriptionService } from '../src/services/subscription.service.js';
import { BarberService } from '../src/services/barber.service.js';
import { AppointmentService } from '../src/services/appointment.service.js';
import { PlatformController } from '../src/controllers/platform.controller.js';
import { AppError } from '../src/middleware/errorHandler.js';
import { SubscriptionStatus, AppointmentStatus, Role, TenantStatus, PlanInterval } from '@prisma/client';
import prisma from '../src/config/prisma.js';

describe('SaaS Subscription & Plan Tier Enforcement Suite', () => {
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
   * TEST A, B, C, D: maxBarbers quota enforcement
   * Tenant on plan allowing 3 barbers can create barbers #1, #2, #3, but barber #4 is rejected with 400 BARBER_LIMIT_REACHED.
   */
  it('TEST A, B, C, D: enforces maxBarbers limit accurately (allows up to limit, rejects exceeding)', async () => {
    const tenantId = 'tenant-3-barbers';
    let currentBarbersCount = 0;

    const mockPlan = {
      id: 'plan-3-barbers',
      name: 'Tier-3',
      slug: 'tier-3',
      maxBarbers: 3,
      maxMonthlyAppointments: 500,
      isActive: true,
      price: 500,
      interval: PlanInterval.MONTHLY,
    };

    const mockSub = {
      id: 'sub-tier-3',
      tenantId,
      planId: mockPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      plan: mockPlan,
    };

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async () => mockSub,
      },
      barber: {
        count: async () => currentBarbersCount,
      },
    };

    // TEST A: Create Barber #1 (count = 0, limit = 3)
    const check1 = await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
    assert.strictEqual(check1.currentCount, 0);
    assert.strictEqual(check1.limit, 3);
    currentBarbersCount = 1;

    // TEST B: Create Barber #2 (count = 1, limit = 3)
    const check2 = await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
    assert.strictEqual(check2.currentCount, 1);
    currentBarbersCount = 2;

    // TEST C: Create Barber #3 (count = 2, limit = 3)
    const check3 = await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
    assert.strictEqual(check3.currentCount, 2);
    currentBarbersCount = 3;

    // TEST D: Attempt Barber #4 (count = 3, limit = 3) -> Must reject with 400 BARBER_LIMIT_REACHED
    await assert.rejects(
      async () => {
        await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
      },
      (err: any) => {
        assert.ok(err instanceof AppError, 'Must be an AppError');
        assert.strictEqual(err.statusCode, 400, 'Must return HTTP 400');
        assert.strictEqual(err.code, 'BARBER_LIMIT_REACHED', 'Must return machine-readable code BARBER_LIMIT_REACHED');
        assert.strictEqual(err.message.includes('Maximum barber limit reached'), true);
        return true;
      }
    );
  });

  /**
   * TEST E: Cross-tenant isolation of barber limits
   * Another tenant's barbers do not count toward Tenant A's limit.
   */
  it("TEST E: cross-tenant isolation ensures Tenant B's barbers do not count toward Tenant A's limit", async () => {
    const tenantAId = 'tenant-a-id';
    const tenantBId = 'tenant-b-id';

    const tenantABarbers = ['barber-a-1', 'barber-a-2'];
    const tenantBBarbers = ['barber-b-1', 'barber-b-2', 'barber-b-3', 'barber-b-4'];

    const mockPlan = {
      id: 'plan-starter',
      name: 'Starter Tier',
      slug: 'starter',
      maxBarbers: 3,
      maxMonthlyAppointments: 200,
      isActive: true,
      price: 300,
      interval: PlanInterval.MONTHLY,
    };

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async ({ where }: any) => ({
          id: `sub-${where.tenantId}`,
          tenantId: where.tenantId,
          planId: mockPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: mockPlan,
        }),
      },
      barber: {
        count: async ({ where }: any) => {
          if (where.tenantId === tenantAId) {
            return tenantABarbers.length;
          }
          if (where.tenantId === tenantBId) {
            return tenantBBarbers.length;
          }
          return 0;
        },
      },
    };

    // Tenant A currently has 2 barbers on a 3-barber plan -> checkBarberLimit succeeds
    const checkA = await SubscriptionService.checkBarberLimit(tenantAId, mockTx as any);
    assert.strictEqual(checkA.currentCount, 2);
    assert.strictEqual(checkA.limit, 3);

    // Tenant B has 4 barbers on a 3-barber plan -> checkBarberLimit fails for Tenant B
    await assert.rejects(
      async () => {
        await SubscriptionService.checkBarberLimit(tenantBId, mockTx as any);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'BARBER_LIMIT_REACHED');
        return true;
      }
    );

    // Tenant A is completely isolated and unaffected by Tenant B's state
    const checkA2 = await SubscriptionService.checkBarberLimit(tenantAId, mockTx as any);
    assert.strictEqual(checkA2.currentCount, 2);
  });

  /**
   * TEST F & G: maxMonthlyAppointments quota enforcement
   * Tenant with monthly appointment limit can create appointments up to limit, and exceeding is rejected.
   */
  it('TEST F & G: enforces maxMonthlyAppointments limit (allows up to monthly cap, rejects when reached)', async () => {
    const tenantId = 'tenant-cap-2';
    let currentAptCount = 0;

    const mockPlan = {
      id: 'plan-cap-2',
      name: 'Capped Plan',
      slug: 'capped-2',
      maxBarbers: 5,
      maxMonthlyAppointments: 2,
      isActive: true,
      price: 200,
      interval: PlanInterval.MONTHLY,
    };

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async () => ({
          id: 'sub-cap-2',
          tenantId,
          planId: mockPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: mockPlan,
        }),
      },
      appointment: {
        count: async () => currentAptCount,
      },
    };

    // TEST F: Appointment #1 in 2026-10
    const check1 = await SubscriptionService.checkMonthlyAppointmentLimit(
      tenantId,
      '2026-10-05',
      mockTx as any
    );
    assert.strictEqual(check1.currentCount, 0);
    assert.strictEqual(check1.limit, 2);
    currentAptCount = 1;

    // Appointment #2 in 2026-10
    const check2 = await SubscriptionService.checkMonthlyAppointmentLimit(
      tenantId,
      '2026-10-12',
      mockTx as any
    );
    assert.strictEqual(check2.currentCount, 1);
    currentAptCount = 2;

    // TEST G: Attempt Appointment #3 in 2026-10 -> Fails with 400 MONTHLY_APPOINTMENT_LIMIT_REACHED
    await assert.rejects(
      async () => {
        await SubscriptionService.checkMonthlyAppointmentLimit(
          tenantId,
          '2026-10-20',
          mockTx as any
        );
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'MONTHLY_APPOINTMENT_LIMIT_REACHED');
        assert.strictEqual(err.message.includes('Monthly appointment limit reached'), true);
        return true;
      }
    );
  });

  /**
   * TEST H: Cancelled appointments release quota
   * Cancelled appointments (status === CANCELLED) are excluded from active monthly quota.
   */
  it('TEST H: cancelled appointments release monthly quota so slots can be reused', async () => {
    const tenantId = 'tenant-cancellation-quota';
    const appointmentsInMonth = [
      { id: 'apt-1', status: AppointmentStatus.CONFIRMED, appointmentDate: '2026-10-01' },
      { id: 'apt-2', status: AppointmentStatus.COMPLETED, appointmentDate: '2026-10-02' },
      { id: 'apt-3', status: AppointmentStatus.CANCELLED, appointmentDate: '2026-10-03' }, // Cancelled
    ];

    const mockPlan = {
      id: 'plan-3-apts',
      name: 'Small Tier',
      slug: 'small',
      maxBarbers: 2,
      maxMonthlyAppointments: 3,
      isActive: true,
      price: 150,
      interval: PlanInterval.MONTHLY,
    };

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async () => ({
          id: 'sub-1',
          tenantId,
          planId: mockPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: mockPlan,
        }),
      },
      appointment: {
        count: async ({ where }: any) => {
          // Verify status condition is { not: AppointmentStatus.CANCELLED }
          assert.strictEqual(where.status.not, AppointmentStatus.CANCELLED);
          return appointmentsInMonth.filter((a) => a.status !== AppointmentStatus.CANCELLED).length;
        },
      },
    };

    // Total non-cancelled = 2 (apt-1 and apt-2). apt-3 was cancelled.
    // Plan limit = 3. Current active count = 2.
    const check = await SubscriptionService.checkMonthlyAppointmentLimit(
      tenantId,
      '2026-10-15',
      mockTx as any
    );

    assert.strictEqual(check.currentCount, 2, 'Cancelled appointment does not count toward limit');
    assert.strictEqual(check.limit, 3);
  });

  /**
   * TEST I: Independent monthly counters for different tenants
   */
  it('TEST I: different tenants have independent monthly counters and timezone isolation', async () => {
    const tenantAId = 'tenant-a-ethiopia';
    const tenantBId = 'tenant-b-kenya';

    const mockPlan = {
      id: 'plan-standard',
      name: 'Standard Tier',
      slug: 'standard',
      maxBarbers: 5,
      maxMonthlyAppointments: 10,
      isActive: true,
      price: 500,
      interval: PlanInterval.MONTHLY,
    };

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async ({ where }: any) => ({
          id: `sub-${where.tenantId}`,
          tenantId: where.tenantId,
          planId: mockPlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: mockPlan,
        }),
      },
      appointment: {
        count: async ({ where }: any) => {
          if (where.tenantId === tenantAId) {
            return 10; // Tenant A is at capacity
          }
          if (where.tenantId === tenantBId) {
            return 2; // Tenant B has capacity
          }
          return 0;
        },
      },
    };

    // Tenant A is rejected (10/10)
    await assert.rejects(
      async () => {
        await SubscriptionService.checkMonthlyAppointmentLimit(tenantAId, '2026-10-15', mockTx as any);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'MONTHLY_APPOINTMENT_LIMIT_REACHED');
        return true;
      }
    );

    // Tenant B is permitted (2/10)
    const checkB = await SubscriptionService.checkMonthlyAppointmentLimit(tenantBId, '2026-10-15', mockTx as any);
    assert.strictEqual(checkB.currentCount, 2);
    assert.strictEqual(checkB.limit, 10);
  });

  /**
   * TEST J: Concurrent barber creation concurrency lock safety
   */
  it('TEST J: concurrent barber creation acquires advisory lock and fails closed on lock failure', async () => {
    const tenantId = 'tenant-concurrency-barber';

    const mockTxFailingLock = {
      $queryRaw: async () => {
        throw new Error('Lock acquisition error');
      },
      subscription: {
        findFirst: async () => ({
          id: 'sub-1',
          tenantId,
          planId: 'plan-1',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: { id: 'plan-1', name: 'Pro', maxBarbers: 5, isActive: true },
        }),
      },
      barber: { count: async () => 0 },
    };

    await assert.rejects(
      async () => {
        await SubscriptionService.checkBarberLimit(tenantId, mockTxFailingLock as any);
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 500);
        assert.strictEqual(err.code, 'CONCURRENCY_LOCK_FAILED');
        return true;
      }
    );
  });

  /**
   * TEST K: Concurrent appointment creation concurrency lock safety
   */
  it('TEST K: concurrent appointment creation acquires advisory lock and fails closed on lock failure', async () => {
    const tenantId = 'tenant-concurrency-apt';

    const mockTxFailingLock = {
      $queryRaw: async () => {
        throw new Error('Lock acquisition error');
      },
      subscription: {
        findFirst: async () => ({
          id: 'sub-1',
          tenantId,
          planId: 'plan-1',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: { id: 'plan-1', name: 'Pro', maxMonthlyAppointments: 500, isActive: true },
        }),
      },
      appointment: { count: async () => 0 },
    };

    await assert.rejects(
      async () => {
        await SubscriptionService.checkMonthlyAppointmentLimit(tenantId, '2026-10-15', mockTxFailingLock as any);
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 500);
        assert.strictEqual(err.code, 'CONCURRENCY_LOCK_FAILED');
        return true;
      }
    );
  });

  /**
   * TEST L: Expired / Inactive / Suspended subscription lifecycle enforcement
   */
  it('TEST L: rejects resource creation on EXPIRED, SUSPENDED, CANCELLED, or past-due subscriptions', async () => {
    const tenantId = 'tenant-expired';

    const testStatuses = [
      { status: SubscriptionStatus.EXPIRED, expectedCode: 'SUBSCRIPTION_EXPIRED' },
      { status: SubscriptionStatus.SUSPENDED, expectedCode: 'SUBSCRIPTION_SUSPENDED' },
      { status: SubscriptionStatus.CANCELLED, expectedCode: 'SUBSCRIPTION_INACTIVE' },
      { status: SubscriptionStatus.PAST_DUE, expectedCode: 'SUBSCRIPTION_INACTIVE' },
    ];

    for (const item of testStatuses) {
      const mockTx = {
        $queryRaw: async () => [],
        subscription: {
          findFirst: async () => ({
            id: 'sub-test',
            tenantId,
            planId: 'plan-1',
            status: item.status,
            currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Period ended
            plan: { id: 'plan-1', name: 'Standard', maxBarbers: 5, maxMonthlyAppointments: 100, isActive: true },
          }),
        },
      };

      await assert.rejects(
        async () => {
          await SubscriptionService.getEffectiveSubscription(tenantId, mockTx as any);
        },
        (err: any) => {
          assert.ok(err instanceof AppError);
          assert.strictEqual(err.statusCode, 403, `Must return 403 for status ${item.status}`);
          assert.strictEqual(err.code, item.expectedCode);
          return true;
        }
      );
    }

    // Also test date-based expiration on ACTIVE subscription whose currentPeriodEnd is in past
    const mockTxDateExpired = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async () => ({
          id: 'sub-date-expired',
          tenantId,
          planId: 'plan-1',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
          plan: { id: 'plan-1', name: 'Standard', maxBarbers: 5, maxMonthlyAppointments: 100, isActive: true },
        }),
      },
    };

    await assert.rejects(
      async () => {
        await SubscriptionService.getEffectiveSubscription(tenantId, mockTxDateExpired as any);
      },
      (err: any) => {
        assert.strictEqual(err.statusCode, 403);
        assert.strictEqual(err.code, 'SUBSCRIPTION_EXPIRED');
        return true;
      }
    );
  });

  /**
   * TEST M: SUPER_ADMIN platform operations continue working
   */
  it('TEST M: SUPER_ADMIN platform operations are not blocked by tenant subscription limits', async () => {
    const origFindManyPlans = prisma.plan.findMany;
    const origFindManySubs = prisma.subscription.findMany;

    try {
      (prisma as any).plan.findMany = async () => [
        { id: 'plan-1', name: 'Starter', maxBarbers: 2 },
        { id: 'plan-2', name: 'Pro', maxBarbers: 10 },
      ];
      (prisma as any).subscription.findMany = async () => [
        { id: 'sub-1', tenantId: 't-1', status: 'ACTIVE' },
      ];

      const resPlans = createMockRes();
      await PlatformController.getPlans({} as any, resPlans, () => {});
      assert.strictEqual(resPlans.statusCode, 200);
      assert.strictEqual(resPlans.jsonData.data.length, 2);

      const resSubs = createMockRes();
      await PlatformController.getSubscriptions({} as any, resSubs, () => {});
      assert.strictEqual(resSubs.statusCode, 200);
      assert.strictEqual(resSubs.jsonData.data.length, 1);
    } finally {
      (prisma as any).plan.findMany = origFindManyPlans;
      (prisma as any).subscription.findMany = origFindManySubs;
    }
  });

  /**
   * TEST N: Plan upgrade increases capacity
   */
  it('TEST N: plan upgrade immediately increases available barber and appointment capacity', async () => {
    const tenantId = 'tenant-upgrade-test';

    const starterPlan = {
      id: 'plan-starter',
      name: 'Starter',
      slug: 'starter',
      maxBarbers: 2,
      maxMonthlyAppointments: 50,
      isActive: true,
      price: 300,
      interval: PlanInterval.MONTHLY,
    };

    const enterprisePlan = {
      id: 'plan-enterprise',
      name: 'Enterprise Tier',
      slug: 'enterprise',
      maxBarbers: 20,
      maxMonthlyAppointments: 5000,
      isActive: true,
      price: 3000,
      interval: PlanInterval.MONTHLY,
    };

    let activePlan = starterPlan;

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async () => ({
          id: 'sub-upgrade',
          tenantId,
          planId: activePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: activePlan,
        }),
      },
      barber: { count: async () => 2 },
    };

    // On Starter plan with 2 active barbers, adding a 3rd is rejected
    await assert.rejects(
      async () => {
        await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
      },
      (err: any) => {
        assert.strictEqual(err.code, 'BARBER_LIMIT_REACHED');
        return true;
      }
    );

    // Upgrade to Enterprise Tier
    activePlan = enterprisePlan;

    // After upgrade, checkBarberLimit succeeds and allows up to 20 barbers
    const checkUpgrade = await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
    assert.strictEqual(checkUpgrade.currentCount, 2);
    assert.strictEqual(checkUpgrade.limit, 20);
    assert.strictEqual(checkUpgrade.plan.name, 'Enterprise Tier');
  });

  /**
   * TEST O: Plan downgrade preserves existing resources but blocks new ones above limit
   */
  it('TEST O: plan downgrade preserves existing barbers and appointments but blocks new creations', async () => {
    const tenantId = 'tenant-downgrade-test';

    const proPlan = {
      id: 'plan-pro',
      name: 'Professional',
      slug: 'pro',
      maxBarbers: 10,
      maxMonthlyAppointments: 2000,
      isActive: true,
      price: 1200,
      interval: PlanInterval.MONTHLY,
    };

    const starterPlan = {
      id: 'plan-starter',
      name: 'Starter',
      slug: 'starter',
      maxBarbers: 2,
      maxMonthlyAppointments: 100,
      isActive: true,
      price: 300,
      interval: PlanInterval.MONTHLY,
    };

    // Tenant previously created 4 barbers on Pro plan
    const existingBarbersCount = 4;
    let activePlan = proPlan;

    const mockTx = {
      $queryRaw: async () => [],
      subscription: {
        findFirst: async () => ({
          id: 'sub-downgrade',
          tenantId,
          planId: activePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: activePlan,
        }),
      },
      barber: { count: async () => existingBarbersCount },
    };

    // On Pro plan: 4 active barbers out of 10 limit -> allowed
    const checkPro = await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
    assert.strictEqual(checkPro.currentCount, 4);
    assert.strictEqual(checkPro.limit, 10);

    // Plan downgraded to Starter (maxBarbers = 2)
    activePlan = starterPlan;

    // Existing 4 barbers remain intact in the database (existingBarbersCount is still 4)
    // But attempting to add barber #5 is rejected because 4 >= 2
    await assert.rejects(
      async () => {
        await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
      },
      (err: any) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'BARBER_LIMIT_REACHED');
        assert.strictEqual(err.message.includes('Maximum barber limit reached (2)'), true);
        return true;
      }
    );
  });

  /**
   * TEST P: Barber creation and checkBarberLimit use $executeRaw for advisory lock
   */
  it('TEST P: Barber creation executes $executeRaw for pg_advisory_xact_lock without void deserialization errors', async () => {
    const tenantId = 'tenant-execute-raw-barber';
    let executeRawCalled = false;
    let queryRawCalled = false;

    const mockTx = {
      $executeRaw: async () => {
        executeRawCalled = true;
        return 1;
      },
      $queryRaw: async () => {
        queryRawCalled = true;
        return [];
      },
      subscription: {
        findFirst: async () => ({
          id: 'sub-p',
          tenantId,
          planId: 'plan-1',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          plan: { id: 'plan-1', name: 'Starter', maxBarbers: 5, isActive: true },
        }),
      },
      barber: { count: async () => 1 },
    };

    const res = await SubscriptionService.checkBarberLimit(tenantId, mockTx as any);
    assert.strictEqual(res.currentCount, 1);
    assert.strictEqual(res.limit, 5);
    assert.strictEqual(executeRawCalled, true, '$executeRaw must be called for advisory lock');
    assert.strictEqual(queryRawCalled, false, '$queryRaw must not be called when $executeRaw is available');
  });
});

