import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { barbersApi } from '../../api/barbers.api';
import { scheduleApi } from '../../api/schedule.api';
import type { Barber, BarberAvailability, BusinessSchedule, DayOfWeek } from '../../types';
import {
  Users,
  UserPlus,
  Clock,
  Phone,
  Mail,
  Lock,
  User,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const DAYS_OF_WEEK: { day: DayOfWeek; name: string }[] = [
  { day: 0, name: 'Sunday' },
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
];

export const AdminBarbersPage: React.FC = () => {
  const [barbersList, setBarbersList] = useState<Barber[]>([]);
  const [businessSchedule, setBusinessSchedule] = useState<BusinessSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Create Barber Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingBarber, setIsSavingBarber] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Manage Availability Modal State
  const [selectedBarberForSchedule, setSelectedBarberForSchedule] = useState<Barber | null>(null);
  const [currentBarberAvailability, setCurrentBarberAvailability] = useState<BarberAvailability[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const fetchBarbersAndSchedule = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [barbs, sched] = await Promise.all([
        barbersApi.getBarbers(true),
        scheduleApi.getBusinessSchedule(),
      ]);
      setBarbersList(barbs || []);
      setBusinessSchedule(sched || []);
    } catch (err: any) {
      setApiError(err?.message || 'Failed to load master barbers.');
      setBarbersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbersAndSchedule();
  }, []);

  // Toggle Barber Active/Inactive State
  const handleToggleActive = async (barberId: string) => {
    try {
      const updated = await barbersApi.toggleBarberStatus(barberId);
      setBarbersList((prev) =>
        prev.map((b) => (b.id === barberId ? updated : b))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle barber status.');
    }
  };

  // Open availability modal
  const handleOpenScheduleModal = async (barber: Barber) => {
    setSelectedBarberForSchedule(barber);
    setIsLoadingAvailability(true);
    setAvailabilityError(null);
    try {
      const avail = await barbersApi.getBarberAvailability(barber.id);
      setCurrentBarberAvailability(avail || []);
    } catch (err: any) {
      setAvailabilityError(err?.message || 'Failed to load barber availability.');
      setCurrentBarberAvailability([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Create Barber Submission
  const handleCreateBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim() || !newEmail.trim() || !newPassword) return;

    setIsSavingBarber(true);
    setAddError(null);

    try {
      await barbersApi.createBarber({
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        password: newPassword,
      });

      await fetchBarbersAndSchedule();
      setIsAddModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create master barber.');
    } finally {
      setIsSavingBarber(false);
    }
  };

  // Update specific day availability window in local state
  const handleToggleDayShift = (dayOfWeek: DayOfWeek, defaultStart: string, defaultEnd: string, enabled: boolean) => {
    if (!selectedBarberForSchedule) return;

    if (!enabled) {
      setCurrentBarberAvailability((prev) => prev.filter((a) => a.dayOfWeek !== dayOfWeek));
    } else {
      setCurrentBarberAvailability((prev) => [
        ...prev.filter((a) => a.dayOfWeek !== dayOfWeek),
        {
          id: `temp-${dayOfWeek}`,
          barberId: selectedBarberForSchedule.id,
          dayOfWeek,
          startTime: defaultStart,
          endTime: defaultEnd,
        },
      ]);
    }
  };

  const handleUpdateTime = (dayOfWeek: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    setCurrentBarberAvailability((prev) =>
      prev.map((a) => (a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a))
    );
  };

  const handleSaveAvailability = async () => {
    if (!selectedBarberForSchedule) return;

    setIsSavingAvailability(true);
    setAvailabilityError(null);

    try {
      const windows = currentBarberAvailability.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      }));

      await barbersApi.updateBarberAvailability(selectedBarberForSchedule.id, windows);
      setSelectedBarberForSchedule(null);
    } catch (err: any) {
      setAvailabilityError(err?.message || 'Failed to save shift availability.');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-500" />
            <span>Master Barber Roster</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Provision staff profiles, configure weekly chair availability, and manage operational status.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setAddError(null);
            setIsAddModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Master Barber
        </Button>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Barbers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
          <span>Loading master barbers...</span>
        </div>
      ) : barbersList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {barbersList.map((barber: Barber) => {
            return (
              <Card
                key={barber.id}
                className="border-neutral-800 bg-neutral-900/90 flex flex-col justify-between hover:border-neutral-700 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500 font-bold">
                        {barber.profileImage ? (
                          <img
                            src={barber.profileImage}
                            alt={barber.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-neutral-100">
                          {barber.fullName}
                        </h3>
                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          <span>{barber.phone}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        barber.isActive
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {barber.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenScheduleModal(barber)}
                    leftIcon={<Clock className="w-3.5 h-3.5" />}
                  >
                    Shift Hours
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(barber.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      barber.isActive
                        ? 'border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-950/60'
                        : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/60'
                    }`}
                  >
                    {barber.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Barbers on Roster"
          description="Provision master barbers to accept bookings across shop workstations."
          icon={<Users className="w-10 h-10 stroke-1 text-neutral-500" />}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAddError(null);
                setIsAddModalOpen(true);
              }}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add First Barber
            </Button>
          }
        />
      )}

      {/* CREATE BARBER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Master Barber"
        description="Create a new barber account for appointment assignments and station scheduling."
        maxWidth="md"
      >
        <form onSubmit={handleCreateBarber} className="space-y-4 pt-2">
          {addError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs">
              {addError}
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="e.g. Samuel Bekele"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="samuel@barbershop.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Phone Number"
            placeholder="+251 91 123 4567"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            required
          />

          <Input
            label="Initial Password"
            type="password"
            placeholder="Min. 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingBarber}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Save Barber Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* MANAGE SHIFTS & AVAILABILITY MODAL */}
      <Modal
        isOpen={Boolean(selectedBarberForSchedule)}
        onClose={() => setSelectedBarberForSchedule(null)}
        title={`Shift Availability — ${selectedBarberForSchedule?.fullName}`}
        description="Configure start and finish shift hours for each weekday."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBarberForSchedule(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSavingAvailability}
              onClick={handleSaveAvailability}
            >
              Save Shifts
            </Button>
          </div>
        }
      >
        {isLoadingAvailability ? (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
            <span>Loading availability shifts...</span>
          </div>
        ) : (
          <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto pr-1">
            {availabilityError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs">
                {availabilityError}
              </div>
            )}
            {DAYS_OF_WEEK.map(({ day, name }) => {
              const shopDay = businessSchedule.find((s) => s.dayOfWeek === day);
              const shift = currentBarberAvailability.find(
                (a) => a.dayOfWeek === day
              );
              const isWorkingDay = Boolean(shift);

              return (
                <div
                  key={day}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isWorkingDay
                      ? 'border-neutral-800 bg-neutral-950'
                      : 'border-neutral-900 bg-neutral-950/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`day-${day}`}
                      checked={isWorkingDay}
                      disabled={shopDay ? !shopDay.isOpen : false}
                      onChange={(e) => {
                        const defaultStart = shopDay?.openTime || '09:00';
                        const defaultEnd = shopDay?.closeTime || '17:00';
                        handleToggleDayShift(day, defaultStart, defaultEnd, e.target.checked);
                      }}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-neutral-700 bg-neutral-900"
                    />
                    <label htmlFor={`day-${day}`} className="font-bold text-neutral-200 cursor-pointer">
                      {name}
                    </label>
                    {shopDay && !shopDay.isOpen && (
                      <span className="text-[10px] text-red-400 font-semibold uppercase">
                        Shop Closed
                      </span>
                    )}
                  </div>

                  {isWorkingDay ? (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Shift:</span>
                      <input
                        type="time"
                        value={shift?.startTime || '09:00'}
                        onChange={(e) => handleUpdateTime(day, 'startTime', e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="text-neutral-500">to</span>
                      <input
                        type="time"
                        value={shift?.endTime || '17:00'}
                        onChange={(e) => handleUpdateTime(day, 'endTime', e.target.value)}
                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-[11px] italic">Off Duty</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};