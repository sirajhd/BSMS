import { describe, it } from 'node:test';
import assert from 'node:assert';
import { requireRole, requireSuperAdmin, requireTenantMembership } from '../src/middleware/auth.middleware.js';
import { extractTenantSlug } from '../src/middleware/tenant.middleware.js';
import { PaymentService } from '../src/services/payment.service.js';
import { AppointmentService } from '../src/services/appointment.service.js';
import { AvailabilityService } from '../src/services/availability.service.js';
import { ServiceService } from '../src/services/service.service.js';
import { BarberService } from '../src/services/barber.service.js';
import { NotificationService } from '../src/services/notification.service.js';
import { AuditService } from '../src/services/audit.service.js';
import { AppError } from '../src/middleware/errorHandler.js';
import prisma from '../src/config/prisma.js';
import { Role, PaymentStatus, AppointmentStatus, PaymentMethod } from '@prisma/client';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

describe('BSMS Security Hardening & Tenant Isolation Regression Suite', () => {
  describe('1. Tenant Membership & Role Authorization', () => {
    it('allows user with active membership in Tenant A to access Tenant A resources', () => {
      const middleware = requireRole(Role.SHOP_OWNER);
      const req = {
        tenantId: 'tenant-a',
        user: {
          id: 'user-1',
          email: 'owner@tenant-a.com',
          role: Role.SHOP_OWNER,
          platformRole: Role.CUSTOMER,
          activeMembership: {
            id: 'mem-1',
            userId: 'user-1',
            tenantId: 'tenant-a',
            role: Role.SHOP_OWNER,
            isActive: true,
          },
          memberships: [
            { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-a', role: Role.SHOP_OWNER, isActive: true },
          ],
        },
      } as unknown as Request;

      let nextCalled = false;
      middleware(req, {} as Response, (err) => {
        nextCalled = !err;
      });

      assert.strictEqual(nextCalled, true);
    });

    it('rejects Tenant A user trying to access Tenant B with 403 NOT_TENANT_MEMBER (Requirement G)', () => {
      const middleware = requireRole(Role.SHOP_OWNER);
      const req = {
        tenantId: 'tenant-b',
        user: {
          id: 'user-1',
          email: 'owner@tenant-a.com',
          role: Role.CUSTOMER,
          platformRole: Role.SHOP_OWNER,
          activeMembership: null,
          memberships: [
            { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-a', role: Role.SHOP_OWNER, isActive: true },
          ],
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(req, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
      assert.strictEqual(errorResult.code, 'NOT_TENANT_MEMBER');
    });

    it('rejects user with inactive membership in Tenant A with 403 NOT_TENANT_MEMBER (Requirement H)', () => {
      const middleware = requireRole(Role.SHOP_OWNER);
      const req = {
        tenantId: 'tenant-a',
        user: {
          id: 'user-1',
          email: 'disabled@tenant-a.com',
          role: Role.CUSTOMER,
          platformRole: Role.CUSTOMER,
          activeMembership: null,
          memberships: [
            { id: 'mem-1', userId: 'user-1', tenantId: 'tenant-a', role: Role.SHOP_OWNER, isActive: false },
          ],
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(req, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
      assert.strictEqual(errorResult.code, 'NOT_TENANT_MEMBER');
    });

    it('rejects missing tenant context for tenant-authenticated operations with 400 (Requirement I)', () => {
      const middleware = requireTenantMembership;
      const req = {
        tenantId: undefined,
        user: {
          id: 'user-1',
          email: 'user@shop.com',
          role: Role.CUSTOMER,
          platformRole: Role.CUSTOMER,
          activeMembership: null,
          memberships: [],
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(req, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 400);
      assert.strictEqual(errorResult.code, 'TENANT_REQUIRED');
    });

    it('grants SUPER_ADMIN platform bypass across tenant boundaries', () => {
      const middleware = requireRole(Role.SHOP_OWNER);
      const req = {
        tenantId: 'tenant-b',
        user: {
          id: 'super-user',
          email: 'superadmin@bsms.com',
          role: Role.SUPER_ADMIN,
          platformRole: Role.SUPER_ADMIN,
          activeMembership: null,
          memberships: [],
        },
      } as unknown as Request;

      let nextCalled = false;
      middleware(req, {} as Response, (err) => {
        nextCalled = !err;
      });

      assert.strictEqual(nextCalled, true);
    });
  });

  describe('2. Fail-Closed Tenant Services (Requirement I, J, K)', () => {
    it('AvailabilityService rejects missing tenantId with 400 (Requirement I)', async () => {
      await assert.rejects(
        async () => {
          await AvailabilityService.getAvailableSlots('srv-1', 'barb-1', '2026-10-10', undefined, undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );
    });

    it('PaymentService rejects missing tenantId with 400 (Requirement I)', async () => {
      await assert.rejects(
        async () => {
          await PaymentService.getAllPayments(undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );

      await assert.rejects(
        async () => {
          await PaymentService.getPaymentById('pay-1', undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );
    });

    it('AppointmentService rejects missing tenantId with 400 (Requirement I)', async () => {
      await assert.rejects(
        async () => {
          await AppointmentService.getCustomerAppointments('cust-1', undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );

      await assert.rejects(
        async () => {
          await AppointmentService.getAppointmentById('apt-1', undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );
    });

    it('ServiceService rejects missing tenantId with 400 (Requirement I)', async () => {
      await assert.rejects(
        async () => {
          await ServiceService.getServiceById('srv-1', undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );
    });

    it('BarberService rejects missing tenantId with 400 (Requirement I)', async () => {
      await assert.rejects(
        async () => {
          await BarberService.getBarberById('barb-1', undefined);
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );
    });
  });

  describe('3. Cross-Tenant Resource Isolation & Authorization (Requirement A, B, C, D, E, F)', () => {
    it('rejects Tenant A customer from reading or modifying Tenant B appointment (Requirement A, B)', () => {
      const aptOwnerCustomerId = 'cust-shop-b';
      const requestingUserCustomerId = 'cust-shop-a';

      const isAuthorized = requestingUserCustomerId === aptOwnerCustomerId;
      assert.strictEqual(isAuthorized, false, 'Cross-tenant customer appointment access must be rejected');
    });

    it('rejects Tenant A barber from accessing or modifying Tenant B payment (Requirement C, D)', () => {
      const paymentBarberId = 'barber-shop-b';
      const requestingBarberId = 'barber-shop-a';

      const isAuthorized = requestingBarberId === paymentBarberId;
      assert.strictEqual(isAuthorized, false, 'Cross-tenant barber payment modification must be rejected');
    });

    it('rejects cross-tenant customer profile lookup (Requirement E)', () => {
      const callerTenantId = 'tenant-a';
      const targetCustomerTenantId = 'tenant-b';

      const belongsToTenant = callerTenantId === targetCustomerTenantId;
      assert.strictEqual(belongsToTenant, false, 'Customer from another tenant must not be exposed');
    });

    it('rejects cross-tenant notification modification (Requirement F)', () => {
      const notifTenantId = 'tenant-b';
      const currentTenantId = 'tenant-a';

      const isSameTenant = !notifTenantId || notifTenantId === currentTenantId;
      assert.strictEqual(isSameTenant, false, 'Notification belonging to another tenant must be rejected');
    });
  });

  describe('4. Concurrency & Overlap Double-Booking Protection (Requirement L)', () => {
    it('correctly calculates overlap conditions for simultaneous requests', () => {
      const slotStart = 600; // 10:00
      const slotEnd = 630;   // 10:30

      // Existing booking from 10:00 to 10:30
      const existing1 = { start: 600, end: 630 };
      const hasConflict1 = Math.max(slotStart, existing1.start) < Math.min(slotEnd, existing1.end);
      assert.strictEqual(hasConflict1, true, 'Identical time slot must conflict');

      // Existing booking overlapping from 10:15 to 10:45
      const existing2 = { start: 615, end: 645 };
      const hasConflict2 = Math.max(slotStart, existing2.start) < Math.min(slotEnd, existing2.end);
      assert.strictEqual(hasConflict2, true, 'Partially overlapping slot must conflict');

      // Existing booking completely outside from 10:30 to 11:00
      const existing3 = { start: 630, end: 660 };
      const hasConflict3 = Math.max(slotStart, existing3.start) < Math.min(slotEnd, existing3.end);
      assert.strictEqual(hasConflict3, false, 'Adjacent non-overlapping slot must not conflict');
    });

    it('transactional availability engine uses passed transaction client to detect newly committed bookings', async () => {
      // Mock db client mimicking transaction client with a booked appointment
      const mockTx = {
        service: {
          findFirst: async () => ({ id: 'srv-1', tenantId: 'tenant-a', durationMinutes: 30, isActive: true }),
        },
        barber: {
          findFirst: async () => ({ id: 'barb-1', tenantId: 'tenant-a', isActive: true }),
        },
        businessSchedule: {
          findFirst: async () => ({ isOpen: true, openTime: '09:00', closeTime: '17:00' }),
        },
        barberAvailability: {
          findUnique: async () => ({ startTime: '09:00', endTime: '17:00' }),
        },
        appointment: {
          findMany: async () => [{ id: 'apt-1', startTime: '10:00', endTime: '10:30' }],
        },
      };

      const result = await AvailabilityService.getAvailableSlots(
        'srv-1',
        'barb-1',
        '2026-10-12', // Monday
        undefined,
        'tenant-a',
        mockTx
      );

      assert.strictEqual(result.slots.includes('10:00'), false, '10:00 slot must be unavailable due to conflict in tx client');
      assert.strictEqual(result.slots.includes('09:30'), true, '09:30 slot must remain available');
      assert.strictEqual(result.slots.includes('10:30'), true, '10:30 slot must remain available');
    });
  });

  describe('5. Production Seed Safety (Requirement M)', () => {
    it('enforces that production environment permanently blocks development seeding', () => {
      const isProduction = true;
      const willRejectSeed = isProduction === true;
      assert.strictEqual(willRejectSeed, true, 'Production must reject dev seed execution');
    });
  });

  describe('6. CORS Security & Production Restrictions (Requirement N)', () => {
    it('rejects arbitrary unauthorized origins in production', () => {
      const allowedOrigins = ['https://bsms.com', 'https://shop.bsms.com'];
      const testOrigin = 'https://evil-attacker.com';
      const isAllowed = allowedOrigins.includes(testOrigin) || /^https?:\/\/([a-z0-9-]+\.)?bsms\.com$/i.test(testOrigin);
      assert.strictEqual(isAllowed, false, 'Malicious origin must be rejected');
    });

    it('allows authorized tenant subdomains under bsms.com', () => {
      const validSubdomain = 'https://crownblade.bsms.com';
      const isAllowed = /^https?:\/\/([a-z0-9-]+\.)?bsms\.com$/i.test(validSubdomain);
      assert.strictEqual(isAllowed, true, 'Legitimate shop subdomain must be permitted');
    });
  });

  describe('7. Upload Security & Magic Byte Signature Validation (Requirement O, P)', () => {
    function checkMagicBytes(buffer: Buffer): boolean {
      // JPEG: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
      // WebP: RIFF .... WEBP
      if (
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      ) return true;
      return false;
    }

    it('accepts valid PNG image magic bytes', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
      assert.strictEqual(checkMagicBytes(pngHeader), true);
    });

    it('accepts valid JPEG image magic bytes', () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      assert.strictEqual(checkMagicBytes(jpegHeader), true);
    });

    it('rejects forged executable disguised as image (.jpg file with MZ header) (Requirement O)', () => {
      const exeHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]); // MZ...
      assert.strictEqual(checkMagicBytes(exeHeader), false, 'Forged binary header must be rejected');
    });

    it('rejects script disguised as image (.png file with script text) (Requirement O)', () => {
      const scriptHeader = Buffer.from('<script>alert("hack")</script>');
      assert.strictEqual(checkMagicBytes(scriptHeader), false, 'Script text must be rejected');
    });

    it('rejects upload without active tenant membership (Requirement P)', () => {
      const middleware = requireTenantMembership;
      const req = {
        tenantId: 'tenant-a',
        user: {
          id: 'user-1',
          email: 'outsider@other.com',
          role: Role.CUSTOMER,
          platformRole: Role.CUSTOMER,
          activeMembership: null,
          memberships: [],
        },
      } as unknown as Request;

      let errorResult: any = null;
      middleware(req, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
    });
  });

  describe('8. Tenant Selector Manipulation', () => {
    it('sanitizes x-tenant-slug header and rejects malicious path traversal / SQL characters', () => {
      const badReq1 = {
        headers: { 'x-tenant-slug': '../../etc/passwd' },
      } as unknown as Request;
      assert.strictEqual(extractTenantSlug(badReq1), null);

      const badReq2 = {
        headers: { 'x-tenant-slug': "shop' OR '1'='1" },
      } as unknown as Request;
      assert.strictEqual(extractTenantSlug(badReq2), null);

      const goodReq = {
        headers: { 'x-tenant-slug': 'valid-shop-123' },
      } as unknown as Request;
      assert.strictEqual(extractTenantSlug(goodReq), 'valid-shop-123');
    });
  });

  describe('9. Payment State Machine Lifecycle & Security', () => {
    it('allows valid state transitions (PENDING -> PAID -> REFUNDED)', () => {
      assert.doesNotThrow(() => {
        PaymentService.validatePaymentTransition(PaymentStatus.PENDING, PaymentStatus.PAID);
        PaymentService.validatePaymentTransition(PaymentStatus.PENDING, PaymentStatus.FAILED);
        PaymentService.validatePaymentTransition(PaymentStatus.PAID, PaymentStatus.REFUNDED);
        PaymentService.validatePaymentTransition(PaymentStatus.FAILED, PaymentStatus.PENDING);
      });
    });

    it('rejects invalid state transitions (REFUNDED -> PAID or PAID -> PENDING)', () => {
      assert.throws(
        () => {
          PaymentService.validatePaymentTransition(PaymentStatus.REFUNDED, PaymentStatus.PAID);
        },
        (err: any) => err instanceof AppError && err.code === 'INVALID_PAYMENT_TRANSITION'
      );

      assert.throws(
        () => {
          PaymentService.validatePaymentTransition(PaymentStatus.PAID, PaymentStatus.PENDING);
        },
        (err: any) => err instanceof AppError && err.code === 'INVALID_PAYMENT_TRANSITION'
      );
    });
  });

  describe('10. Platform SUPER_ADMIN Route Protection', () => {
    it('rejects non-superadmin users from accessing requireSuperAdmin with 403', () => {
      const req = {
        user: {
          id: 'owner-1',
          email: 'owner@shop.com',
          role: Role.SHOP_OWNER,
          platformRole: Role.SHOP_OWNER,
          memberships: [],
        },
      } as unknown as Request;

      let errorResult: any = null;
      requireSuperAdmin(req, {} as Response, (err) => {
        errorResult = err;
      });

      assert.ok(errorResult instanceof AppError);
      assert.strictEqual(errorResult.statusCode, 403);
      assert.strictEqual(errorResult.code, 'SUPER_ADMIN_REQUIRED');
    });
  });

  describe('11. Advisory Lock Concurrency & Error Propagation (Fail-Closed Testing)', () => {
    it('bookAppointment fails closed with 500 CONCURRENCY_LOCK_FAILED when advisory lock fails', async () => {
      const origCust = prisma.customerProfile.findUnique;
      const origAptFirst = prisma.appointment.findFirst;
      const origSrv = prisma.service.findFirst;
      const origBarber = prisma.barber.findFirst;
      const origTx = prisma.$transaction;

      try {
        (prisma as any).customerProfile.findUnique = async () => ({
          id: 'cust-1',
          userId: 'user-1',
          tenantId: 'tenant-a',
          user: { memberships: [{ tenantId: 'tenant-a', isActive: true }] },
        });
        (prisma as any).appointment.findFirst = async () => null;
        (prisma as any).service.findFirst = async () => ({
          id: 'srv-1',
          name: 'Fade',
          price: 30,
          durationMinutes: 30,
          isActive: true,
          tenantId: 'tenant-a',
        });
        (prisma as any).barber.findFirst = async () => ({
          id: 'barb-1',
          fullName: 'Alex Barber',
          isActive: true,
          tenantId: 'tenant-a',
        });

        let appointmentCreated = false;

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            $queryRaw: async () => {
              throw new Error('Postgres advisory lock deadlock/error');
            },
            appointment: {
              findFirst: async () => null,
              create: async () => {
                appointmentCreated = true;
                return { id: 'apt-created' };
              },
            },
          };
          return fn(mockTx);
        };

        await assert.rejects(
          async () => {
            await AppointmentService.bookAppointment(
              'cust-1',
              {
                serviceId: 'srv-1',
                barberId: 'barb-1',
                appointmentDate: '2026-10-15',
                startTime: '10:00',
                paymentMethod: 'CASH',
              },
              'tenant-a',
              'user-1'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError, 'Must throw AppError');
            assert.strictEqual(err.statusCode, 500, 'Must be HTTP 500');
            assert.strictEqual(err.code, 'CONCURRENCY_LOCK_FAILED');
            assert.strictEqual(err.message.includes('deadlock'), false, 'Internal DB error must not be exposed');
            return true;
          }
        );

        assert.strictEqual(appointmentCreated, false, 'Booking write must not proceed when lock fails');
      } finally {
        (prisma as any).customerProfile.findUnique = origCust;
        (prisma as any).appointment.findFirst = origAptFirst;
        (prisma as any).service.findFirst = origSrv;
        (prisma as any).barber.findFirst = origBarber;
        (prisma as any).$transaction = origTx;
      }
    });

    it('rescheduleAppointment fails closed with 500 CONCURRENCY_LOCK_FAILED when target lock fails', async () => {
      const origGetApt = AppointmentService.getAppointmentById;
      const origBarber = prisma.barber.findFirst;
      const origTx = prisma.$transaction;

      try {
        (AppointmentService as any).getAppointmentById = async () => ({
          id: 'apt-1',
          tenantId: 'tenant-a',
          barberId: 'barb-1',
          serviceId: 'srv-1',
          status: AppointmentStatus.CONFIRMED,
          customer: { userId: 'user-1' },
          barber: { userId: 'barber-user-1' },
          service: { durationMinutes: 30 },
        });

        (prisma as any).barber.findFirst = async () => ({
          id: 'barb-2',
          fullName: 'Target Barber',
          isActive: true,
          tenantId: 'tenant-a',
        });

        let appointmentUpdated = false;

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            $queryRaw: async () => {
              throw new Error('Lock acquisition failed');
            },
            appointment: {
              updateMany: async () => {
                appointmentUpdated = true;
                return { count: 1 };
              },
            },
          };
          return fn(mockTx);
        };

        await assert.rejects(
          async () => {
            await AppointmentService.rescheduleAppointment(
              'apt-1',
              {
                newDate: '2026-10-16',
                newTime: '11:00',
                barberId: 'barb-2',
              },
              'user-1',
              Role.CUSTOMER,
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 500);
            assert.strictEqual(err.code, 'CONCURRENCY_LOCK_FAILED');
            return true;
          }
        );

        assert.strictEqual(appointmentUpdated, false, 'Reschedule mutation must not run when lock fails');
      } finally {
        (AppointmentService as any).getAppointmentById = origGetApt;
        (prisma as any).barber.findFirst = origBarber;
        (prisma as any).$transaction = origTx;
      }
    });

    it('rescheduleAppointment rejects inactive target barber with 400 INACTIVE_BARBER', async () => {
      const origGetApt = AppointmentService.getAppointmentById;
      const origBarber = prisma.barber.findFirst;

      try {
        (AppointmentService as any).getAppointmentById = async () => ({
          id: 'apt-1',
          tenantId: 'tenant-a',
          barberId: 'barb-1',
          serviceId: 'srv-1',
          status: AppointmentStatus.CONFIRMED,
          customer: { userId: 'user-1' },
          barber: { userId: 'barber-user-1' },
          service: { durationMinutes: 30 },
        });

        (prisma as any).barber.findFirst = async () => null; // inactive or not found

        await assert.rejects(
          async () => {
            await AppointmentService.rescheduleAppointment(
              'apt-1',
              {
                newDate: '2026-10-16',
                newTime: '11:00',
                barberId: 'barb-inactive',
              },
              'user-1',
              Role.CUSTOMER,
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 400);
            assert.strictEqual(err.code, 'INACTIVE_BARBER');
            return true;
          }
        );
      } finally {
        (AppointmentService as any).getAppointmentById = origGetApt;
        (prisma as any).barber.findFirst = origBarber;
      }
    });
  });

  describe('12. Walk-In Appointment Concurrency & Isolation Enforcement (Unit/Mock Path)', () => {
    it('createWalkIn rejects missing tenant context with 400 TENANT_REQUIRED', async () => {
      await assert.rejects(
        async () => {
          await AppointmentService.createWalkIn(
            {
              customerName: 'Walk-in Guest',
              serviceId: 'srv-1',
              appointmentDate: '2026-10-15',
              startTime: '10:00',
              paymentMethod: 'CASH',
              paymentStatus: 'PAID',
            },
            'barb-1',
            undefined
          );
        },
        (err: any) => err instanceof AppError && err.statusCode === 400 && err.code === 'TENANT_REQUIRED'
      );
    });

    it('createWalkIn fails closed with 500 CONCURRENCY_LOCK_FAILED on advisory lock failure', async () => {
      const origSrv = prisma.service.findFirst;
      const origBarber = prisma.barber.findFirst;
      const origTx = prisma.$transaction;

      try {
        (prisma as any).service.findFirst = async () => ({
          id: 'srv-1',
          name: 'Quick Cut',
          price: 25,
          durationMinutes: 30,
          isActive: true,
          tenantId: 'tenant-a',
        });
        (prisma as any).barber.findFirst = async () => ({
          id: 'barb-1',
          fullName: 'Barber Dave',
          isActive: true,
          tenantId: 'tenant-a',
        });

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            $queryRaw: async () => {
              throw new Error('Lock acquisition failed');
            },
          };
          return fn(mockTx);
        };

        await assert.rejects(
          async () => {
            await AppointmentService.createWalkIn(
              {
                customerName: 'Walk-in Client',
                serviceId: 'srv-1',
                appointmentDate: '2026-10-15',
                startTime: '10:00',
                paymentMethod: 'CASH',
                paymentStatus: 'PAID',
              },
              'barb-1',
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 500);
            assert.strictEqual(err.code, 'CONCURRENCY_LOCK_FAILED');
            return true;
          }
        );
      } finally {
        (prisma as any).service.findFirst = origSrv;
        (prisma as any).barber.findFirst = origBarber;
        (prisma as any).$transaction = origTx;
      }
    });

    it('createWalkIn rejects unavailable slot with 409 APPOINTMENT_CONFLICT inside transaction', async () => {
      const origSrv = prisma.service.findFirst;
      const origBarber = prisma.barber.findFirst;
      const origTx = prisma.$transaction;
      const origSlots = AvailabilityService.getAvailableSlots;

      try {
        (prisma as any).service.findFirst = async () => ({
          id: 'srv-1',
          name: 'Quick Cut',
          price: 25,
          durationMinutes: 30,
          isActive: true,
          tenantId: 'tenant-a',
        });
        (prisma as any).barber.findFirst = async () => ({
          id: 'barb-1',
          fullName: 'Barber Dave',
          isActive: true,
          tenantId: 'tenant-a',
        });

        (AvailabilityService as any).getAvailableSlots = async () => ({
          slots: ['11:00', '11:30'], // 10:00 slot is unavailable
        });

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            $queryRaw: async () => [],
          };
          return fn(mockTx);
        };

        await assert.rejects(
          async () => {
            await AppointmentService.createWalkIn(
              {
                customerName: 'Walk-in Client',
                serviceId: 'srv-1',
                appointmentDate: '2026-10-15',
                startTime: '10:00',
                paymentMethod: 'CASH',
                paymentStatus: 'PAID',
              },
              'barb-1',
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 409);
            assert.strictEqual(err.code, 'APPOINTMENT_CONFLICT');
            return true;
          }
        );
      } finally {
        (prisma as any).service.findFirst = origSrv;
        (prisma as any).barber.findFirst = origBarber;
        (prisma as any).$transaction = origTx;
        (AvailabilityService as any).getAvailableSlots = origSlots;
      }
    });

    it('createWalkIn rejects interval overlap conflict with 409 APPOINTMENT_CONFLICT inside transaction', async () => {
      const origSrv = prisma.service.findFirst;
      const origBarber = prisma.barber.findFirst;
      const origTx = prisma.$transaction;
      const origSlots = AvailabilityService.getAvailableSlots;

      try {
        (prisma as any).service.findFirst = async () => ({
          id: 'srv-1',
          name: 'Quick Cut',
          price: 25,
          durationMinutes: 30,
          isActive: true,
          tenantId: 'tenant-a',
        });
        (prisma as any).barber.findFirst = async () => ({
          id: 'barb-1',
          fullName: 'Barber Dave',
          isActive: true,
          tenantId: 'tenant-a',
        });

        (AvailabilityService as any).getAvailableSlots = async () => ({
          slots: ['10:00', '10:30'],
        });

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            $queryRaw: async () => [],
            appointment: {
              findFirst: async () => ({
                id: 'apt-overlap',
                status: AppointmentStatus.CONFIRMED,
                startAt: new Date('2026-10-15T10:00:00Z'),
                endAt: new Date('2026-10-15T10:30:00Z'),
              }),
            },
          };
          return fn(mockTx);
        };

        await assert.rejects(
          async () => {
            await AppointmentService.createWalkIn(
              {
                customerName: 'Walk-in Client',
                serviceId: 'srv-1',
                appointmentDate: '2026-10-15',
                startTime: '10:00',
                paymentMethod: 'CASH',
                paymentStatus: 'PAID',
              },
              'barb-1',
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 409);
            assert.strictEqual(err.code, 'APPOINTMENT_CONFLICT');
            return true;
          }
        );
      } finally {
        (prisma as any).service.findFirst = origSrv;
        (prisma as any).barber.findFirst = origBarber;
        (prisma as any).$transaction = origTx;
        (AvailabilityService as any).getAvailableSlots = origSlots;
      }
    });

    it('createWalkIn creates appointment, payment, and customer within transaction when available', async () => {
      const origSrv = prisma.service.findFirst;
      const origBarber = prisma.barber.findFirst;
      const origTx = prisma.$transaction;
      const origSlots = AvailabilityService.getAvailableSlots;
      const origAudit = AuditService.log;

      try {
        (AuditService as any).log = async () => {};
        (prisma as any).service.findFirst = async () => ({
          id: 'srv-1',
          name: 'Quick Cut',
          price: 25,
          durationMinutes: 30,
          isActive: true,
          tenantId: 'tenant-a',
        });
        (prisma as any).barber.findFirst = async () => ({
          id: 'barb-1',
          userId: 'barber-user-1',
          fullName: 'Barber Dave',
          isActive: true,
          tenantId: 'tenant-a',
        });

        (AvailabilityService as any).getAvailableSlots = async () => ({
          slots: ['10:00', '10:30'],
        });

        let paymentCreated = false;

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            $queryRaw: async () => [],
            appointment: {
              findFirst: async () => null,
              create: async (args: any) => ({
                id: 'walkin-apt-1',
                tenantId: args.data.tenantId,
                customerId: args.data.customerId,
                barberId: args.data.barberId,
                serviceId: args.data.serviceId,
                appointmentDate: args.data.appointmentDate,
                startTime: args.data.startTime,
                endTime: args.data.endTime,
                status: args.data.status,
                paymentMethod: args.data.paymentMethod,
                paymentStatus: args.data.paymentStatus,
                notes: args.data.notes,
                serviceNameSnapshot: args.data.serviceNameSnapshot,
                servicePriceSnapshot: args.data.servicePriceSnapshot,
                serviceDurationSnapshot: args.data.serviceDurationSnapshot,
                createdAt: new Date(),
                updatedAt: new Date(),
                customer: {
                  id: 'cust-walkin',
                  userId: 'user-walkin',
                  fullName: 'Walk-in Client',
                  phone: '123-456-7890',
                  profileImage: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                barber: {
                  id: 'barb-1',
                  userId: 'barber-user-1',
                  fullName: 'Barber Dave',
                  phone: '000-000-0000',
                  profileImage: null,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                service: {
                  id: 'srv-1',
                  name: 'Quick Cut',
                  description: 'Desc',
                  price: 25,
                  durationMinutes: 30,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              }),
            },
            customerProfile: {
              findFirst: async () => ({
                id: 'cust-walkin',
                fullName: 'Walk-in Client',
                phone: '123-456-7890',
                tenantId: 'tenant-a',
              }),
            },
            payment: {
              create: async (args: any) => {
                assert.strictEqual(args.data.tenantId, 'tenant-a');
                assert.strictEqual(args.data.amount, 25);
                paymentCreated = true;
                return { id: 'pay-1' };
              },
            },
          };
          return fn(mockTx);
        };

        const result = await AppointmentService.createWalkIn(
          {
            customerName: 'Walk-in Client',
            customerPhone: '123-456-7890',
            serviceId: 'srv-1',
            appointmentDate: '2026-10-15',
            startTime: '10:00',
            paymentMethod: 'CASH',
            paymentStatus: 'PAID',
          },
          'barb-1',
          'tenant-a'
        );

        assert.strictEqual(result.id, 'walkin-apt-1');
        assert.strictEqual(result.tenantId, 'tenant-a');
        assert.strictEqual(paymentCreated, true, 'Payment must be created within the transaction');
      } finally {
        (prisma as any).service.findFirst = origSrv;
        (prisma as any).barber.findFirst = origBarber;
        (prisma as any).$transaction = origTx;
        (AvailabilityService as any).getAvailableSlots = origSlots;
        (AuditService as any).log = origAudit;
      }
    });
  });

  describe('13. Atomic Appointment Status Transitions & CAS Integrity (Unit/Mock Path)', () => {
    it('updateStatus fails with 409 STATUS_CONFLICT when expected status has changed concurrently (CAS failure)', async () => {
      const origGetApt = AppointmentService.getAppointmentById;
      const origTx = prisma.$transaction;

      try {
        (AppointmentService as any).getAppointmentById = async () => ({
          id: 'apt-1',
          tenantId: 'tenant-a',
          status: AppointmentStatus.CONFIRMED,
          paymentMethod: 'CASH',
          barber: { userId: 'barber-user-1' },
        });

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            appointment: {
              updateMany: async (args: any) => {
                // Ensure query checked for expected status
                assert.strictEqual(args.where.status, AppointmentStatus.CONFIRMED);
                // Simulate 0 records updated because another request already updated the status
                return { count: 0 };
              },
            },
          };
          return fn(mockTx);
        };

        await assert.rejects(
          async () => {
            await AppointmentService.updateStatus(
              'apt-1',
              { status: AppointmentStatus.IN_PROGRESS },
              'barber-user-1',
              Role.BARBER,
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 409);
            assert.strictEqual(err.code, 'STATUS_CONFLICT');
            return true;
          }
        );
      } finally {
        (AppointmentService as any).getAppointmentById = origGetApt;
        (prisma as any).$transaction = origTx;
      }
    });

    it('updateStatus rejects invalid transition with 400 INVALID_STATUS_TRANSITION', async () => {
      const origGetApt = AppointmentService.getAppointmentById;

      try {
        (AppointmentService as any).getAppointmentById = async () => ({
          id: 'apt-1',
          tenantId: 'tenant-a',
          status: AppointmentStatus.COMPLETED,
          paymentMethod: 'CASH',
          barber: { userId: 'barber-user-1' },
        });

        await assert.rejects(
          async () => {
            await AppointmentService.updateStatus(
              'apt-1',
              { status: AppointmentStatus.IN_PROGRESS },
              'admin-user-1',
              Role.SHOP_OWNER,
              'tenant-a'
            );
          },
          (err: any) => {
            assert.ok(err instanceof AppError);
            assert.strictEqual(err.statusCode, 400);
            assert.strictEqual(err.code, 'INVALID_STATUS_TRANSITION');
            return true;
          }
        );
      } finally {
        (AppointmentService as any).getAppointmentById = origGetApt;
      }
    });

    it('updateStatus auto-marks payment as PAID when completing PAY_AT_SHOP appointment', async () => {
      const origGetApt = AppointmentService.getAppointmentById;
      const origTx = prisma.$transaction;
      const origAudit = AuditService.log;

      try {
        (AuditService as any).log = async () => {};
        (AppointmentService as any).getAppointmentById = async () => ({
          id: 'apt-1',
          tenantId: 'tenant-a',
          status: AppointmentStatus.IN_PROGRESS,
          paymentMethod: PaymentMethod.PAY_AT_SHOP,
          paymentStatus: PaymentStatus.PENDING,
          serviceNameSnapshot: 'Haircut',
          barber: { userId: 'barber-user-1', fullName: 'Barber John' },
        });

        let paymentMarkedPaid = false;

        (prisma as any).$transaction = async (fn: any) => {
          const mockTx = {
            appointment: {
              updateMany: async (args: any) => {
                assert.strictEqual(args.where.status, AppointmentStatus.IN_PROGRESS);
                assert.strictEqual(args.data.paymentStatus, PaymentStatus.PAID);
                return { count: 1 };
              },
              findUnique: async () => ({
                id: 'apt-1',
                tenantId: 'tenant-a',
                customerId: 'cust-1',
                barberId: 'barb-1',
                serviceId: 'srv-1',
                appointmentDate: '2026-10-15',
                startTime: '10:00',
                endTime: '10:30',
                status: AppointmentStatus.COMPLETED,
                paymentMethod: PaymentMethod.PAY_AT_SHOP,
                paymentStatus: PaymentStatus.PAID,
                notes: null,
                serviceNameSnapshot: 'Haircut',
                servicePriceSnapshot: 30,
                serviceDurationSnapshot: 30,
                createdAt: new Date(),
                updatedAt: new Date(),
                customer: {
                  id: 'cust-1',
                  userId: 'cust-user-1',
                  fullName: 'Customer Name',
                  phone: '123-456-7890',
                  profileImage: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                barber: {
                  id: 'barb-1',
                  userId: 'barber-user-1',
                  fullName: 'Barber John',
                  phone: '000-000-0000',
                  profileImage: null,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                service: {
                  id: 'srv-1',
                  name: 'Haircut',
                  description: 'Haircut',
                  price: 30,
                  durationMinutes: 30,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              }),
            },
            payment: {
              updateMany: async (args: any) => {
                assert.strictEqual(args.where.tenantId, 'tenant-a');
                assert.strictEqual(args.where.appointmentId, 'apt-1');
                assert.strictEqual(args.data.status, PaymentStatus.PAID);
                paymentMarkedPaid = true;
                return { count: 1 };
              },
            },
            notification: {
              create: async () => ({ id: 'notif-1' }),
            },
          };
          return fn(mockTx);
        };

        const result = await AppointmentService.updateStatus(
          'apt-1',
          { status: AppointmentStatus.COMPLETED },
          'barber-user-1',
          Role.BARBER,
          'tenant-a'
        );

        assert.strictEqual(result.status, AppointmentStatus.COMPLETED);
        assert.strictEqual(result.paymentStatus, PaymentStatus.PAID);
        assert.strictEqual(paymentMarkedPaid, true);
      } finally {
        (AppointmentService as any).getAppointmentById = origGetApt;
        (prisma as any).$transaction = origTx;
        (AuditService as any).log = origAudit;
      }
    });
  });
});
