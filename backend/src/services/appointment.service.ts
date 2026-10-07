import {
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  NotificationType,
  Role,
} from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AvailabilityService } from './availability.service.js';
import { AuditService } from './audit.service.js';
import { SubscriptionService } from './subscription.service.js';
import type {
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  UpdateAppointmentStatusInput,
  CreateWalkInInput,
} from '../validators/appointment.validator.js';

export class AppointmentService {
  static getActiveStatuses(): AppointmentStatus[] {
    return [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.RESCHEDULED,
    ];
  }

  static calculateEndTime(startTime: string, durationMinutes: number): string {
    const totalMinutes =
      AvailabilityService.parseMinutes(startTime) + durationMinutes;

    return AvailabilityService.formatMinutes(totalMinutes);
  }

  static createTimestamps(
    dateStr: string,
    startTime: string,
    endTime: string
  ) {
    const startAt = new Date(`${dateStr}T${startTime}:00Z`);
    const endAt = new Date(`${dateStr}T${endTime}:00Z`);

    return { startAt, endAt };
  }

  // Format appointment for API responses matching frontend types
  static formatAppointment(apt: any) {
    return {
      id: apt.id,
      tenantId: apt.tenantId,
      customerId: apt.customerId,
      barberId: apt.barberId,
      serviceId: apt.serviceId,
      appointmentDate: apt.appointmentDate,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      paymentMethod: apt.paymentMethod,
      paymentStatus: apt.paymentStatus,
      notes: apt.notes || undefined,
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString(),

      customer: apt.customer
        ? {
            id: apt.customer.id,
            userId: apt.customer.userId,
            fullName: apt.customer.fullName,
            phone: apt.customer.phone,
            profileImage: apt.customer.profileImage || undefined,
            createdAt: apt.customer.createdAt.toISOString(),
            updatedAt: apt.customer.updatedAt.toISOString(),
          }
        : undefined,

      barber: apt.barber
        ? {
            id: apt.barber.id,
            userId: apt.barber.userId,
            fullName: apt.barber.fullName,
            phone: apt.barber.phone,
            profileImage: apt.barber.profileImage || undefined,
            isActive: apt.barber.isActive,
            createdAt: apt.barber.createdAt.toISOString(),
            updatedAt: apt.barber.updatedAt.toISOString(),
          }
        : undefined,

      service: apt.service
        ? {
            id: apt.service.id,
            name: apt.serviceNameSnapshot || apt.service.name,
            description: apt.service.description,
            price: apt.servicePriceSnapshot ?? apt.service.price,
            durationMinutes:
              apt.serviceDurationSnapshot ?? apt.service.durationMinutes,
            isActive: apt.service.isActive,
            createdAt: apt.service.createdAt.toISOString(),
            updatedAt: apt.service.updatedAt.toISOString(),
          }
        : undefined,
    };
  }

  static async getCustomerAppointments(customerId: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to fetch appointments.', 400, 'TENANT_REQUIRED');
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        customerId,
        tenantId,
      },
      include: {
        customer: true,
        barber: true,
        service: true,
      },
      orderBy: { startAt: 'desc' },
    });

    return appointments.map(this.formatAppointment);
  }

  static async getBarberAppointments(
    barberId: string,
    dateStr?: string,
    status?: AppointmentStatus,
    tenantId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to fetch appointments.', 400, 'TENANT_REQUIRED');
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        barberId,
        tenantId,
        ...(dateStr ? { appointmentDate: dateStr } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        customer: true,
        barber: true,
        service: true,
      },
      orderBy: { startAt: 'asc' },
    });

    return appointments.map(this.formatAppointment);
  }

  static async getAllAppointments(filters: {
    tenantId?: string;
    searchQuery?: string;
    dateStr?: string;
    barberId?: string;
    status?: AppointmentStatus;
  }) {
    if (!filters.tenantId) {
      throw new AppError('Tenant context is required to fetch appointments.', 400, 'TENANT_REQUIRED');
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: filters.tenantId,
        ...(filters.dateStr ? { appointmentDate: filters.dateStr } : {}),
        ...(filters.barberId && filters.barberId !== 'ALL'
          ? { barberId: filters.barberId }
          : {}),
        ...(filters.status && filters.status !== ('ALL' as any)
          ? { status: filters.status }
          : {}),
      },
      include: {
        customer: true,
        barber: true,
        service: true,
      },
      orderBy: { startAt: 'desc' },
    });

    let formatted = appointments.map(this.formatAppointment);

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();

      formatted = formatted.filter(
        (apt) =>
          apt.id.toLowerCase().includes(q) ||
          apt.customer?.fullName.toLowerCase().includes(q) ||
          apt.customer?.phone.toLowerCase().includes(q) ||
          apt.service?.name.toLowerCase().includes(q)
      );
    }

    return formatted;
  }

  static async getAppointmentById(id: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const apt = await prisma.appointment.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true, email: true, role: true, isActive: true },
            },
          },
        },
        barber: {
          include: {
            user: {
              select: { id: true, email: true, role: true, isActive: true },
            },
          },
        },
        service: true,
      },
    });

    if (!apt) {
      throw new AppError(
        'Appointment not found.',
        404,
        'APPOINTMENT_NOT_FOUND'
      );
    }

    return apt;
  }

  // Transactional creation with concurrency & conflict protection + strict tenant scoping
  static async bookAppointment(
    customerId: string,
    input: CreateAppointmentInput,
    tenantId?: string,
    requestingUserId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to book an appointment.', 400, 'TENANT_REQUIRED');
    }

    // 1. Authoritative Customer Verification: customer profile must exist and belong to / be active in tenant
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      include: { user: { include: { memberships: true } } },
    });

    if (!customerProfile) {
      throw new AppError('Customer profile not found.', 404, 'NO_PROFILE');
    }

    if (requestingUserId && customerProfile.userId !== requestingUserId) {
      throw new AppError('Forbidden. Cannot book appointments on behalf of another account.', 403, 'FORBIDDEN');
    }

    const isAuthorizedInTenant =
      customerProfile.tenantId === tenantId ||
      customerProfile.user.memberships.some((m) => m.tenantId === tenantId && m.isActive);

    if (!isAuthorizedInTenant) {
      throw new AppError('Customer is not associated with this business.', 403, 'TENANT_MISMATCH');
    }

    // 2. Verify customer does not already have an active/upcoming appointment in this tenant
    const existingActive = await prisma.appointment.findFirst({
      where: {
        customerId,
        tenantId,
        status: { in: this.getActiveStatuses() },
      },
    });

    if (existingActive) {
      throw new AppError(
        'You already have an active appointment scheduled. System policy permits only one active reservation at a time. Please reschedule or cancel your existing appointment first.',
        409,
        'ACTIVE_APPOINTMENT_EXISTS'
      );
    }

    // 3. Fetch authoritative service and barber within tenant
    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        tenantId,
      },
    });

    if (!service || !service.isActive) {
      throw new AppError(
        'The requested service is inactive or not found in this shop.',
        400,
        'INVALID_SERVICE'
      );
    }

    const barber = await prisma.barber.findFirst({
      where: {
        id: input.barberId,
        tenantId,
      },
    });

    if (!barber || !barber.isActive) {
      throw new AppError(
        'The selected barber is currently unavailable in this shop.',
        400,
        'INACTIVE_BARBER'
      );
    }

    const endTime = this.calculateEndTime(
      input.startTime,
      service.durationMinutes
    );

    const { startAt, endAt } = this.createTimestamps(
      input.appointmentDate,
      input.startTime,
      endTime
    );

    // 4. Atomically check availability and insert appointment in transaction using transaction client
    const created = await prisma.$transaction(async (tx) => {
      // 0. Enforce SaaS Subscription Plan maxMonthlyAppointments limit inside transaction
      await SubscriptionService.checkMonthlyAppointmentLimit(
        tenantId,
        input.appointmentDate,
        tx
      );

      // Advisory transaction lock to serialize concurrent bookings for the specific barber and date (fail closed)
      try {
        if (tx?.$executeRaw) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'bsms_apt_lock_' + tenantId + '_' + input.barberId + '_' + input.appointmentDate}))`;
        } else if (tx?.$queryRaw) {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'bsms_apt_lock_' + tenantId + '_' + input.barberId + '_' + input.appointmentDate}))`;
        }
      } catch (lockError) {
        console.error('Failed to acquire booking advisory transaction lock:', lockError);
        throw new AppError(
          'Unable to acquire scheduling lock for the requested time slot. Please retry.',
          500,
          'CONCURRENCY_LOCK_FAILED'
        );
      }

      // Re-verify slot availability inside transaction using the transaction client
      const availability = await AvailabilityService.getAvailableSlots(
        input.serviceId,
        input.barberId,
        input.appointmentDate,
        undefined,
        tenantId,
        tx
      );

      if (!availability.slots.includes(input.startTime)) {
        throw new AppError(
          'This specific time slot is no longer available. Please choose an alternate time.',
          409,
          'APPOINTMENT_CONFLICT'
        );
      }

      // Exact interval conflict check inside transaction
      const conflictingAppointment = await tx.appointment.findFirst({
        where: {
          barberId: input.barberId,
          tenantId,
          appointmentDate: input.appointmentDate,
          status: { in: this.getActiveStatuses() },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (conflictingAppointment) {
        throw new AppError(
          'This specific time slot is no longer available. Please choose an alternate time.',
          409,
          'APPOINTMENT_CONFLICT'
        );
      }

      const appointment = await tx.appointment.create({
        data: {
          tenantId,
          customerId,
          barberId: input.barberId,
          serviceId: input.serviceId,
          appointmentDate: input.appointmentDate,
          startTime: input.startTime,
          endTime,
          startAt,
          endAt,
          status: AppointmentStatus.CONFIRMED,
          paymentMethod: input.paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          notes: input.notes,
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: service.price,
          serviceDurationSnapshot: service.durationMinutes,
        },
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          barber: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          service: true,
        },
      });

      // Create Payment Ledger entry
      await tx.payment.create({
        data: {
          tenantId,
          appointmentId: appointment.id,
          amount: service.price,
          method: input.paymentMethod as PaymentMethod,
          status: PaymentStatus.PENDING,
          provider: input.paymentMethod === 'ONLINE' ? 'GREY' : 'MANUAL',
        },
      });

      // Notification for Customer
      if (appointment.customer) {
        await tx.notification.create({
          data: {
            userId: appointment.customer.userId,
            tenantId,
            title: 'Booking Confirmed',
            message: `Your ${service.name} cut with ${barber.fullName} is scheduled for ${input.appointmentDate} at ${input.startTime}.`,
            type: NotificationType.BOOKING_CONFIRMED,
          },
        });
      }

      // Notification for Barber
      if (appointment.barber) {
        await tx.notification.create({
          data: {
            userId: appointment.barber.userId,
            tenantId,
            title: 'New Booking Assigned',
            message: `${appointment.customer?.fullName || 'Client'} reserved ${service.name} on ${input.appointmentDate} at ${input.startTime}.`,
            type: NotificationType.BOOKING_CONFIRMED,
          },
        });
      }

      return appointment;
    });

    await AuditService.log({
      tenantId,
      actorUserId: created.customer?.userId,
      action: 'APPOINTMENT_BOOKED',
      entity: 'Appointment',
      entityId: created.id,
      metadata: {
        date: input.appointmentDate,
        time: input.startTime,
        service: service.name,
        barber: barber.fullName,
      },
    });

    return this.formatAppointment(created);
  }

  static async cancelAppointment(
    appointmentId: string,
    requestingUserId: string,
    requestingRole: Role,
    tenantId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const apt = await this.getAppointmentById(appointmentId, tenantId);

    // CUSTOMER can cancel only their own appointment
    if (
      requestingRole === Role.CUSTOMER &&
      apt.customer?.userId !== requestingUserId
    ) {
      throw new AppError(
        'You can only cancel your own appointments.',
        403,
        'FORBIDDEN'
      );
    }

    // BARBER can cancel only appointments assigned to them
    if (
      requestingRole === Role.BARBER &&
      apt.barber?.userId !== requestingUserId
    ) {
      throw new AppError(
        'You can only cancel appointments assigned to your chair.',
        403,
        'FORBIDDEN'
      );
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status)) {
      throw new AppError(
        `Cannot cancel an appointment with status ${apt.status}.`,
        400,
        'INVALID_STATUS_FOR_CANCEL'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateRes = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          tenantId,
          status: { notIn: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        },
        data: { status: AppointmentStatus.CANCELLED },
      });

      if (updateRes.count === 0) {
        throw new AppError('Appointment could not be cancelled or does not belong to this shop.', 400, 'CANCEL_FAILED');
      }

      const cancelled = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          barber: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          service: true,
        },
      });

      if (!cancelled) {
        throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
      }

      // Customer notification
      if (cancelled.customer) {
        await tx.notification.create({
          data: {
            userId: cancelled.customer.userId,
            tenantId,
            title: 'Appointment Cancelled',
            message: `Your reservation for ${cancelled.appointmentDate} at ${cancelled.startTime} has been cancelled.`,
            type: NotificationType.APPOINTMENT_CANCELLED,
          },
        });
      }

      // Barber notification
      if (cancelled.barber) {
        await tx.notification.create({
          data: {
            userId: cancelled.barber.userId,
            tenantId,
            title: 'Appointment Cancelled',
            message: `The booking on ${cancelled.appointmentDate} at ${cancelled.startTime} with ${cancelled.customer?.fullName || 'Client'} was cancelled.`,
            type: NotificationType.APPOINTMENT_CANCELLED,
          },
        });
      }

      return cancelled;
    });

    await AuditService.log({
      tenantId,
      actorUserId: requestingUserId,
      action: 'APPOINTMENT_CANCELLED',
      entity: 'Appointment',
      entityId: appointmentId,
    });

    return this.formatAppointment(updated);
  }

  static async rescheduleAppointment(
    appointmentId: string,
    input: RescheduleAppointmentInput,
    requestingUserId: string,
    requestingRole: Role,
    tenantId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const apt = await this.getAppointmentById(appointmentId, tenantId);

    // CUSTOMER can reschedule only their own appointment
    if (
      requestingRole === Role.CUSTOMER &&
      apt.customer?.userId !== requestingUserId
    ) {
      throw new AppError(
        'You can only reschedule your own appointments.',
        403,
        'FORBIDDEN'
      );
    }

    // BARBER can reschedule only appointments assigned to them
    if (
      requestingRole === Role.BARBER &&
      apt.barber?.userId !== requestingUserId
    ) {
      throw new AppError(
        'You can only reschedule appointments assigned to your chair.',
        403,
        'FORBIDDEN'
      );
    }

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status)) {
      throw new AppError(
        `Cannot reschedule an appointment with status ${apt.status}.`,
        400,
        'INVALID_STATUS_FOR_RESCHEDULE'
      );
    }

    // Authoritatively resolve and validate target barber within tenant
    let targetBarberId = apt.barberId;
    if (input.barberId) {
      const targetBarber = await prisma.barber.findFirst({
        where: {
          id: input.barberId,
          tenantId,
          isActive: true,
        },
      });

      if (!targetBarber) {
        throw new AppError(
          'The selected barber is invalid, inactive, or not found in this shop.',
          400,
          'INACTIVE_BARBER'
        );
      }
      targetBarberId = targetBarber.id;
    } else {
      const currentBarber = await prisma.barber.findFirst({
        where: {
          id: targetBarberId,
          tenantId,
          isActive: true,
        },
      });

      if (!currentBarber) {
        throw new AppError(
          'The assigned barber is inactive or no longer available in this shop.',
          400,
          'INACTIVE_BARBER'
        );
      }
    }

    const duration =
      apt.serviceDurationSnapshot || apt.service.durationMinutes;

    const newEndTime = this.calculateEndTime(
      input.newTime,
      duration
    );

    const { startAt, endAt } = this.createTimestamps(
      input.newDate,
      input.newTime,
      newEndTime
    );

    const updated = await prisma.$transaction(async (tx) => {
      // If moving to a different calendar month, verify capacity in target month
      if (
        apt.appointmentDate &&
        input.newDate.substring(0, 7) !== apt.appointmentDate.substring(0, 7)
      ) {
        await SubscriptionService.checkMonthlyAppointmentLimit(
          tenantId,
          input.newDate,
          tx
        );
      }

      // Advisory transaction lock for target barber and date (fail closed)
      try {
        if (tx?.$executeRaw) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'bsms_apt_lock_' + tenantId + '_' + targetBarberId + '_' + input.newDate}))`;
        } else if (tx?.$queryRaw) {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'bsms_apt_lock_' + tenantId + '_' + targetBarberId + '_' + input.newDate}))`;
        }
      } catch (lockError) {
        console.error('Failed to acquire reschedule advisory transaction lock:', lockError);
        throw new AppError(
          'Unable to acquire scheduling lock for the requested time slot. Please retry.',
          500,
          'CONCURRENCY_LOCK_FAILED'
        );
      }

      // Re-verify availability for the new slot using the transaction client
      const availability =
        await AvailabilityService.getAvailableSlots(
          apt.serviceId,
          targetBarberId,
          input.newDate,
          appointmentId,
          tenantId,
          tx
        );

      if (!availability.slots.includes(input.newTime)) {
        throw new AppError(
          'The newly selected time slot is not available. Please choose an alternate slot.',
          409,
          'APPOINTMENT_CONFLICT'
        );
      }

      // Overlap check inside transaction
      const overlapping = await tx.appointment.findFirst({
        where: {
          barberId: targetBarberId,
          tenantId,
          appointmentDate: input.newDate,
          status: { in: this.getActiveStatuses() },
          id: { not: appointmentId },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (overlapping) {
        throw new AppError(
          'The newly selected time slot is not available. Please choose an alternate slot.',
          409,
          'APPOINTMENT_CONFLICT'
        );
      }

      const updateRes = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          tenantId,
          status: { in: this.getActiveStatuses() },
        },
        data: {
          barberId: targetBarberId,
          appointmentDate: input.newDate,
          startTime: input.newTime,
          endTime: newEndTime,
          startAt,
          endAt,
          status: AppointmentStatus.RESCHEDULED,
        },
      });

      if (updateRes.count === 0) {
        throw new AppError('Appointment could not be rescheduled or does not belong to this shop.', 400, 'UPDATE_FAILED');
      }

      const rescheduled = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          barber: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          service: true,
        },
      });

      if (!rescheduled) {
        throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
      }

      // Notification to customer
      if (rescheduled.customer) {
        await tx.notification.create({
          data: {
            userId: rescheduled.customer.userId,
            tenantId,
            title: 'Appointment Rescheduled',
            message: `Your booking was rescheduled to ${input.newDate} at ${input.newTime}.`,
            type: NotificationType.APPOINTMENT_RESCHEDULED,
          },
        });
      }

      return rescheduled;
    });

    await AuditService.log({
      tenantId,
      actorUserId: requestingUserId,
      action: 'APPOINTMENT_RESCHEDULED',
      entity: 'Appointment',
      entityId: appointmentId,
      metadata: { newDate: input.newDate, newTime: input.newTime },
    });

    return this.formatAppointment(updated);
  }

  // Barber / Admin status updates
  static async updateStatus(
    appointmentId: string,
    input: UpdateAppointmentStatusInput,
    requestingUserId: string,
    requestingRole: Role,
    tenantId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const apt = await this.getAppointmentById(appointmentId, tenantId);

    // CUSTOMER cannot change appointment status
    if (requestingRole === Role.CUSTOMER) {
      throw new AppError(
        'Customers are not allowed to update appointment status.',
        403,
        'FORBIDDEN'
      );
    }

    // BARBER can update status only for appointments assigned to them
    if (
      requestingRole === Role.BARBER &&
      apt.barber?.userId !== requestingUserId
    ) {
      throw new AppError(
        'You can only update appointments assigned to your chair.',
        403,
        'FORBIDDEN'
      );
    }

    const newStatus = input.status as AppointmentStatus;

    // Validate state transitions
    const validTransitions: Record<
      AppointmentStatus,
      AppointmentStatus[]
    > = {
      CONFIRMED: [
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.LATE,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.RESCHEDULED,
      ],
      CHECKED_IN: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.LATE,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      IN_PROGRESS: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ],
      LATE: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      RESCHEDULED: [
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.LATE,
        AppointmentStatus.NO_SHOW,
      ],
      COMPLETED: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    if (
      apt.status !== newStatus &&
      !validTransitions[apt.status].includes(newStatus)
    ) {
      throw new AppError(
        `Invalid status transition from ${apt.status} to ${newStatus}.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Auto-update payment to PAID when completed for pay-at-shop
    const shouldMarkPaid =
      newStatus === AppointmentStatus.COMPLETED &&
      apt.paymentMethod === PaymentMethod.PAY_AT_SHOP;

    const updated = await prisma.$transaction(async (tx) => {
      const updateRes = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          tenantId,
          status: apt.status,
        },
        data: {
          status: newStatus,
          ...(shouldMarkPaid
            ? { paymentStatus: PaymentStatus.PAID }
            : {}),
        },
      });

      if (updateRes.count === 0) {
        throw new AppError('Appointment status has been modified concurrently or does not match the expected state.', 409, 'STATUS_CONFLICT');
      }

      const result = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          customer: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          barber: {
            include: {
              user: {
                select: { id: true, email: true, role: true, isActive: true },
              },
            },
          },
          service: true,
        },
      });

      if (!result) {
        throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
      }

      if (shouldMarkPaid) {
        await tx.payment.updateMany({
          where: { appointmentId, tenantId },
          data: { status: PaymentStatus.PAID },
        });
      }

      // Generate customer notification for status milestones
      if (result.customer) {
        let title = 'Appointment Update';
        let message = `Your appointment status is now: ${newStatus}.`;
        let notifType: NotificationType =
          NotificationType.STATUS_CHANGED;

        if (newStatus === AppointmentStatus.COMPLETED) {
          title = 'Service Completed';
          message = `Thank you for visiting! Your ${result.serviceNameSnapshot} session has finished.`;
        } else if (newStatus === AppointmentStatus.IN_PROGRESS) {
          title = 'Haircut Started';
          message = `Your haircut session with ${result.barber.fullName} is now underway.`;
        } else if (newStatus === AppointmentStatus.LATE) {
          title = 'Marked Late';
          message = `Your appointment is currently marked late. Please proceed to the chair.`;
          notifType = NotificationType.LATE_STATUS;
        } else if (newStatus === AppointmentStatus.NO_SHOW) {
          title = 'Appointment Missed';
          message = `You were marked as a no-show for your reservation.`;
          notifType = NotificationType.NO_SHOW_STATUS;
        }

        await tx.notification.create({
          data: {
            userId: result.customer.userId,
            tenantId,
            title,
            message,
            type: notifType,
          },
        });
      }

      return result;
    });

    await AuditService.log({
      tenantId,
      actorUserId: requestingUserId,
      action: 'APPOINTMENT_STATUS_UPDATED',
      entity: 'Appointment',
      entityId: appointmentId,
      metadata: { previousStatus: apt.status, newStatus },
    });

    return this.formatAppointment(updated);
  }

  // Walk-In creation
  static async createWalkIn(
    input: CreateWalkInInput,
    barberProfileId: string,
    tenantId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to record walk-in appointments.', 400, 'TENANT_REQUIRED');
    }

    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        tenantId,
      },
    });

    if (!service || !service.isActive) {
      throw new AppError(
        'Selected service is inactive or not found in this shop.',
        400,
        'INVALID_SERVICE'
      );
    }

    const barber = await prisma.barber.findFirst({
      where: {
        id: barberProfileId,
        tenantId,
      },
    });

    if (!barber || !barber.isActive) {
      throw new AppError(
        'Assigned barber is inactive in this shop.',
        400,
        'INACTIVE_BARBER'
      );
    }

    const endTime = this.calculateEndTime(
      input.startTime,
      service.durationMinutes
    );

    const { startAt, endAt } = this.createTimestamps(
      input.appointmentDate,
      input.startTime,
      endTime
    );

    const created = await prisma.$transaction(async (tx) => {
      // 0. Enforce SaaS Subscription Plan maxMonthlyAppointments limit inside transaction
      await SubscriptionService.checkMonthlyAppointmentLimit(
        tenantId,
        input.appointmentDate,
        tx
      );

      // 1. Advisory transaction lock to serialize concurrent walk-in bookings for the specific barber and date (fail closed)
      try {
        if (tx?.$executeRaw) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'bsms_apt_lock_' + tenantId + '_' + barberProfileId + '_' + input.appointmentDate}))`;
        } else if (tx?.$queryRaw) {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'bsms_apt_lock_' + tenantId + '_' + barberProfileId + '_' + input.appointmentDate}))`;
        }
      } catch (lockError) {
        console.error('Failed to acquire walk-in advisory transaction lock:', lockError);
        throw new AppError(
          'Unable to acquire scheduling lock for the requested time slot. Please retry.',
          500,
          'CONCURRENCY_LOCK_FAILED'
        );
      }

      // 2. Authoritative availability check inside the transaction using transaction client
      const availability = await AvailabilityService.getAvailableSlots(
        input.serviceId,
        barberProfileId,
        input.appointmentDate,
        undefined,
        tenantId,
        tx
      );

      if (!availability.slots.includes(input.startTime)) {
        throw new AppError(
          'The requested walk-in time slot is no longer available.',
          409,
          'APPOINTMENT_CONFLICT'
        );
      }

      // 3. Exact interval overlap check inside transaction
      const conflictingAppointment = await tx.appointment.findFirst({
        where: {
          barberId: barberProfileId,
          tenantId,
          appointmentDate: input.appointmentDate,
          status: { in: this.getActiveStatuses() },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });

      if (conflictingAppointment) {
        throw new AppError(
          'The requested walk-in time slot conflicts with an existing reservation.',
          409,
          'APPOINTMENT_CONFLICT'
        );
      }

      // 4. Find or create customer profile for walk-in client in this tenant
      let customer = await tx.customerProfile.findFirst({
        where: {
          tenantId,
          ...(input.customerPhone
            ? { phone: input.customerPhone }
            : { fullName: input.customerName }),
        },
      });

      if (!customer) {
        const tempEmail = `walkin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@barbershop.local`;
        const tempPassword = `Walkin${Date.now()}!`;
        const passHash = await import('bcryptjs').then((b) =>
          b.hash(tempPassword, 10)
        );

        const user = await tx.user.create({
          data: {
            email: tempEmail,
            passwordHash: passHash,
            role: Role.CUSTOMER,
            isActive: true,
            customerProfile: {
              create: {
                fullName: input.customerName,
                phone: input.customerPhone || 'Walk-in Client',
                tenantId,
              },
            },
          },
          include: { customerProfile: true },
        });

        await tx.membership.create({
          data: {
            userId: user.id,
            tenantId,
            role: Role.CUSTOMER,
            isActive: true,
          },
        });

        customer = user.customerProfile!;
      }

      const appointment = await tx.appointment.create({
        data: {
          tenantId,
          customerId: customer.id,
          barberId: barberProfileId,
          serviceId: input.serviceId,
          appointmentDate: input.appointmentDate,
          startTime: input.startTime,
          endTime,
          startAt,
          endAt,
          status: AppointmentStatus.CONFIRMED,
          paymentMethod: input.paymentMethod as PaymentMethod,
          paymentStatus: input.paymentStatus as PaymentStatus,
          notes: 'Walk-in Client',
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: service.price,
          serviceDurationSnapshot: service.durationMinutes,
        },
        include: {
          customer: true,
          barber: true,
          service: true,
        },
      });

      await tx.payment.create({
        data: {
          tenantId,
          appointmentId: appointment.id,
          amount: service.price,
          method: input.paymentMethod as PaymentMethod,
          status: input.paymentStatus as PaymentStatus,
          provider: 'MANUAL',
        },
      });

      return appointment;
    });

    await AuditService.log({
      tenantId,
      actorUserId: barber.userId,
      action: 'WALK_IN_CREATED',
      entity: 'Appointment',
      entityId: created.id,
      metadata: { client: input.customerName, service: service.name },
    });

    return this.formatAppointment(created);
  }
}