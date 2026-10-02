import { AppointmentStatus } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export interface TimeSlot {
  time: string; // "HH:mm"
  available: boolean;
  reason?: string;
}

export class AvailabilityService {
  static parseMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  static formatMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  static getBlockingStatuses(): AppointmentStatus[] {
    return [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.IN_PROGRESS,
      AppointmentStatus.LATE,
      AppointmentStatus.RESCHEDULED,
    ];
  }

  static async getAvailableSlots(
    serviceId: string,
    barberId: string,
    dateStr: string, // "YYYY-MM-DD"
    excludeAppointmentId?: string
  ): Promise<{ slots: string[]; metadata: { isOpen: boolean; durationMinutes: number } }> {
    // 1. Validate service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || !service.isActive) {
      throw new AppError('Requested service is invalid or currently inactive.', 400, 'INVALID_SERVICE');
    }

    // 2. Validate barber
    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
    });

    if (!barber || !barber.isActive) {
      throw new AppError('Selected barber is inactive or unavailable.', 400, 'INACTIVE_BARBER');
    }

    // 3. Determine day of week in timezone-safe UTC
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE');
    }
    const [year, month, day] = parts;
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(dateObj.getTime())) {
      throw new AppError('Invalid date format. Use YYYY-MM-DD.', 400, 'INVALID_DATE');
    }
    const dayOfWeek = dateObj.getUTCDay();

    // 4. Check business schedule
    const businessSchedule = await prisma.businessSchedule.findUnique({
      where: { dayOfWeek },
    });

    if (!businessSchedule || !businessSchedule.isOpen) {
      return { slots: [], metadata: { isOpen: false, durationMinutes: service.durationMinutes } };
    }

    // 5. Check barber availability window
    const barberWindow = await prisma.barberAvailability.findUnique({
      where: {
        barberId_dayOfWeek: {
          barberId,
          dayOfWeek,
        },
      },
    });

    if (!barberWindow) {
      return { slots: [], metadata: { isOpen: true, durationMinutes: service.durationMinutes } };
    }

    // 6. Compute effective window
    const shopOpen = this.parseMinutes(businessSchedule.openTime);
    const shopClose = this.parseMinutes(businessSchedule.closeTime);
    const barberStart = this.parseMinutes(barberWindow.startTime);
    const barberEnd = this.parseMinutes(barberWindow.endTime);

    const windowStart = Math.max(shopOpen, barberStart);
    const windowEnd = Math.min(shopClose, barberEnd);
    const duration = service.durationMinutes;

    // 7. Query existing blocking appointments
    const blockingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        appointmentDate: dateStr,
        status: { in: this.getBlockingStatuses() },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    const bookedIntervals = blockingAppointments.map((apt) => ({
      start: this.parseMinutes(apt.startTime),
      end: this.parseMinutes(apt.endTime),
    }));

    // 8. Generate 30-minute interval slots
    const stepInterval = 30;
    const availableSlots: string[] = [];

    for (let time = windowStart; time + duration <= windowEnd; time += stepInterval) {
      const slotEnd = time + duration;

      // Overlap check: existing.start < requested.end && existing.end > requested.start
      const hasConflict = bookedIntervals.some(
        (b) => Math.max(time, b.start) < Math.min(slotEnd, b.end)
      );

      if (!hasConflict) {
        availableSlots.push(this.formatMinutes(time));
      }
    }

    return {
      slots: availableSlots,
      metadata: {
        isOpen: true,
        durationMinutes: duration,
      },
    };
  }
}
