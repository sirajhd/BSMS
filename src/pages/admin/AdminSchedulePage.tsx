import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { scheduleApi } from '../../api/schedule.api';
import type { BusinessSchedule, DayOfWeek } from '../../types';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

const WEEKDAYS: { day: DayOfWeek; name: string }[] = [
  { day: 0, name: 'Sunday' },
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
];

export const AdminSchedulePage: React.FC = () => {
  const [scheduleList, setScheduleList] = useState<BusinessSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSchedule = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await scheduleApi.getBusinessSchedule();
      setScheduleList(data || []);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load business schedule.');
      setScheduleList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleToggleDayOpen = (day: DayOfWeek) => {
    setSuccessMessage('');
    setErrorMessage('');
    setScheduleList((prev) => {
      const exists = prev.find((s) => s.dayOfWeek === day);
      if (exists) {
        return prev.map((item) =>
          item.dayOfWeek === day ? { ...item, isOpen: !item.isOpen } : item
        );
      } else {
        return [
          ...prev,
          {
            id: `temp-${day}`,
            dayOfWeek: day,
            openTime: '09:00',
            closeTime: '18:00',
            isOpen: true,
          },
        ];
      }
    });
  };

  const handleTimeChange = (
    day: DayOfWeek,
    field: 'openTime' | 'closeTime',
    val: string
  ) => {
    setSuccessMessage('');
    setErrorMessage('');
    setScheduleList((prev) => {
      const exists = prev.find((s) => s.dayOfWeek === day);
      if (exists) {
        return prev.map((item) =>
          item.dayOfWeek === day ? { ...item, [field]: val } : item
        );
      } else {
        return [
          ...prev,
          {
            id: `temp-${day}`,
            dayOfWeek: day,
            openTime: field === 'openTime' ? val : '09:00',
            closeTime: field === 'closeTime' ? val : '18:00',
            isOpen: true,
          },
        ];
      }
    });
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    // Prepare array of 7 days
    const fullWeek = WEEKDAYS.map(({ day }) => {
      const existing = scheduleList.find((s) => s.dayOfWeek === day);
      return {
        dayOfWeek: day,
        openTime: existing ? existing.openTime : '09:00',
        closeTime: existing ? existing.closeTime : '18:00',
        isOpen: existing ? existing.isOpen : false,
      };
    });

    // Validate that openTime < closeTime for open days
    for (const item of fullWeek) {
      if (item.isOpen) {
        if (item.openTime >= item.closeTime) {
          const dayName = WEEKDAYS.find((w) => w.day === item.dayOfWeek)?.name || 'Day';
          setErrorMessage(
            `${dayName}: Opening time (${item.openTime}) must be earlier than closing time (${item.closeTime}).`
          );
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const updated = await scheduleApi.updateBusinessSchedule(fullWeek);
      setScheduleList(updated || []);
      setSuccessMessage('Global business hours saved and published across booking engines.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update business schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-amber-500" />
          <span>Global Business Hours & Weekly Schedule</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Set shop operating windows and closed days. These boundaries govern all barber shifts and customer bookings.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
          <span>Loading shop schedule...</span>
        </div>
      ) : (
        <form onSubmit={handleSaveSchedule} className="space-y-4">
          <Card className="border-neutral-800 bg-neutral-900/90 divide-y divide-neutral-800/80 p-0 overflow-hidden">
            {WEEKDAYS.map(({ day, name }) => {
              const currentSchedule = scheduleList.find((s) => s.dayOfWeek === day) || {
                id: `sched-${day}`,
                dayOfWeek: day,
                openTime: '09:00',
                closeTime: '18:00',
                isOpen: day !== 0,
              };

              return (
                <div
                  key={day}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    currentSchedule.isOpen ? 'bg-neutral-900/40' : 'bg-neutral-950/70 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => handleToggleDayOpen(day)}
                      className="focus:outline-none"
                      aria-label={`Toggle open status for ${name}`}
                    >
                      {currentSchedule.isOpen ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-neutral-500" />
                      )}
                    </button>
                    <div>
                      <span className="font-bold text-sm text-neutral-100 block">{name}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider block ${
                          currentSchedule.isOpen ? 'text-emerald-400' : 'text-neutral-500'
                        }`}
                      >
                        {currentSchedule.isOpen ? 'Open for Business' : 'Shop Closed'}
                      </span>
                    </div>
                  </div>

                  {currentSchedule.isOpen ? (
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">Opens:</span>
                        <input
                          type="time"
                          value={currentSchedule.openTime}
                          onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                          className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          required
                        />
                      </div>
                      <span className="text-neutral-500 font-bold">—</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">Closes:</span>
                        <input
                          type="time"
                          value={currentSchedule.closeTime}
                          onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                          className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500 italic">
                      No client reservations or walk-ins accepted
                    </div>
                  )}
                </div>
              );
            })}
          </Card>

          {/* Informational Guidance Box */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-3 text-xs text-amber-200/90">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>System Safeguard:</strong> Changing shop hours automatically restricts barber shift ranges. If a day is toggled to <strong>Closed</strong>, customers cannot select that date on the booking wizard, and barbers cannot book walk-ins for that day.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Save & Publish Operating Hours
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};