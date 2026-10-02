import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AvailabilityService } from '../src/services/availability.service.js';
import { AppointmentService } from '../src/services/appointment.service.js';

describe('Availability Engine & Slot Generator Tests', () => {
  it('correctly converts time strings to minutes and back', () => {
    assert.strictEqual(AvailabilityService.parseMinutes('00:00'), 0);
    assert.strictEqual(AvailabilityService.parseMinutes('08:30'), 510);
    assert.strictEqual(AvailabilityService.parseMinutes('19:45'), 1185);

    assert.strictEqual(AvailabilityService.formatMinutes(0), '00:00');
    assert.strictEqual(AvailabilityService.formatMinutes(510), '08:30');
    assert.strictEqual(AvailabilityService.formatMinutes(1185), '19:45');
  });

  it('correctly calculates appointment end time based on service duration', () => {
    assert.strictEqual(AppointmentService.calculateEndTime('10:00', 30), '10:30');
    assert.strictEqual(AppointmentService.calculateEndTime('10:30', 25), '10:55');
    assert.strictEqual(AppointmentService.calculateEndTime('11:45', 50), '12:35');
  });

  it('correctly enforces overlap detection condition', () => {
    // Existing appointment: 10:00 - 10:30 (mins: 600 - 630)
    const existing = { start: 600, end: 630 };

    const checkOverlap = (reqStart: number, reqEnd: number) => {
      return Math.max(reqStart, existing.start) < Math.min(reqEnd, existing.end);
    };

    // Conflicting: 10:15 - 10:45 (615 - 645) -> Overlaps
    assert.strictEqual(checkOverlap(615, 645), true);

    // Conflicting: 10:00 - 11:00 (600 - 660) -> Overlaps
    assert.strictEqual(checkOverlap(600, 660), true);

    // Conflicting: 09:45 - 10:15 (585 - 615) -> Overlaps
    assert.strictEqual(checkOverlap(585, 615), true);

    // Non-conflicting: 09:30 - 10:00 (570 - 600) -> Adjacent, NO overlap
    assert.strictEqual(checkOverlap(570, 600), false);

    // Non-conflicting: 10:30 - 11:00 (630 - 660) -> Adjacent, NO overlap
    assert.strictEqual(checkOverlap(630, 660), false);
  });
});
