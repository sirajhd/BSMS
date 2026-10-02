import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { appointmentsApi } from '../../api/appointments.api';
import { availabilityApi } from '../../api/availability.api';
import type { Appointment } from '../../types';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  XCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export const CustomerAppointmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'HISTORY' | 'CANCELLED'>('UPCOMING');

  // Live appointments from backend
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cancellation Modal State
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');

  // Rescheduling Modal State
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string>('');

  const loadAppointments = async () => {
    try {
      const data = await appointmentsApi.getAppointments();
      setAppointmentsList(data || []);
    } catch {
      setAppointmentsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Fetch real available slots for the rescheduling date and barber
  useEffect(() => {
    if (!reschedulingApt || !newDate) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const res = await availabilityApi.getAvailableSlots(
          reschedulingApt.serviceId,
          reschedulingApt.barberId,
          newDate
        );
        if (isMounted) {
          setAvailableSlots(res.slots || []);
        }
      } catch {
        if (isMounted) {
          setAvailableSlots([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [reschedulingApt, newDate]);

  const upcomingAppointments = useMemo(() => {
    return appointmentsList.filter((apt) =>
      ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'RESCHEDULED'].includes(apt.status)
    );
  }, [appointmentsList]);

  const historyAppointments = useMemo(() => {
    return appointmentsList.filter((apt) =>
      ['COMPLETED', 'LATE', 'NO_SHOW'].includes(apt.status)
    );
  }, [appointmentsList]);

  const cancelledAppointments = useMemo(() => {
    return appointmentsList.filter((apt) => apt.status === 'CANCELLED');
  }, [appointmentsList]);

  // Execute Cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingApt) return;
    setCancelError('');
    setIsCancelling(true);

    try {
      await appointmentsApi.cancelAppointment(cancellingApt.id);
      await loadAppointments();
      setIsCancelling(false);
      setCancellingApt(null);
    } catch (err: any) {
      setIsCancelling(false);
      setCancelError(err.message || 'Failed to cancel appointment.');
    }
  };

  // Execute Reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingApt || !newDate || !newTime) return;
    setRescheduleError('');
    setIsRescheduling(true);

    try {
      await appointmentsApi.rescheduleAppointment(reschedulingApt.id, {
        newDate,
        newTime,
        barberId: reschedulingApt.barberId,
      });
      await loadAppointments();
      setIsRescheduling(false);
      setReschedulingApt(null);
      setNewTime('');
    } catch (err: any) {
      setIsRescheduling(false);
      setRescheduleError(err.message || 'Failed to reschedule appointment.');
    }
  };

  const currentTabList =
    activeTab === 'UPCOMING'
      ? upcomingAppointments
      : activeTab === 'HISTORY'
      ? historyAppointments
      : cancelledAppointments;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-amber-500" />
          <span>My Appointments</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Review your scheduled visits, past grooming sessions, or modify upcoming reservations.
        </p>
      </div>

      {/* Responsive Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('UPCOMING')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'UPCOMING'
              ? 'bg-amber-600 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <span>Upcoming</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-950/30">
            {upcomingAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'bg-amber-600 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <span>History</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-950/30">
            {historyAppointments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CANCELLED')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'CANCELLED'
              ? 'bg-amber-600 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <span>Cancelled</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-950/30">
            {cancelledAppointments.length}
          </span>
        </button>
      </div>

      {/* Appointment Cards List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
          <span>Loading appointment records...</span>
        </div>
      ) : currentTabList.length > 0 ? (
        <div className="space-y-4">
          {currentTabList.map((apt: Appointment) => (
            <Card
              key={apt.id}
              className="border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge status={apt.status} />
                    <Badge status={apt.paymentStatus} />
                    <span className="text-xs text-neutral-400">
                      Ref: <strong className="text-neutral-300 font-mono">{apt.id.substring(0, 8)}...</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-amber-500" />
                      <span>{apt.service?.name}</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{apt.service?.description}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>Date: <strong className="text-neutral-100">{apt.appointmentDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Time: <strong className="text-neutral-100">{apt.startTime} - {apt.endTime}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <User className="w-3.5 h-3.5 text-amber-500" />
                      <span>Barber: <strong className="text-neutral-100">{apt.barber?.fullName}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6 gap-3 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Price</span>
                    <span className="text-xl font-black text-amber-500">
                      {apt.service?.price} <span className="text-xs font-normal text-neutral-400">ETB</span>
                    </span>
                  </div>

                  {/* Actions for upcoming appointments only */}
                  {['CONFIRMED', 'RESCHEDULED'].includes(apt.status) && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReschedulingApt(apt);
                          setNewDate(apt.appointmentDate);
                          setNewTime('');
                        }}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setCancelError('');
                          setCancellingApt(apt);
                        }}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} appointments`}
          description={
            activeTab === 'UPCOMING'
              ? 'You do not have any upcoming visits booked. Ready to pick a slot?'
              : activeTab === 'HISTORY'
              ? 'No previous completed appointments on file yet.'
              : 'No cancelled appointments on record.'
          }
          icon={<Calendar className="w-10 h-10 stroke-1 text-neutral-500" />}
        />
      )}

      {/* CANCELLATION MODAL */}
      <Modal
        isOpen={Boolean(cancellingApt)}
        onClose={() => setCancellingApt(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel your upcoming booking?"
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCancellingApt(null)}>
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              onClick={handleConfirmCancel}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        {cancellingApt && (
          <div className="space-y-3 text-xs">
            {cancelError && (
              <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
              <p>
                <strong className="text-neutral-100">Service:</strong> {cancellingApt.service?.name}
              </p>
              <p>
                <strong className="text-neutral-100">Barber:</strong> {cancellingApt.barber?.fullName}
              </p>
              <p>
                <strong className="text-neutral-100">Scheduled:</strong> {cancellingApt.appointmentDate} at {cancellingApt.startTime}
              </p>
            </div>
            <p className="text-neutral-400">
              Upon cancellation, your reserved slot will immediately be made available for other clients.
            </p>
          </div>
        )}
      </Modal>

      {/* RESCHEDULING MODAL */}
      <Modal
        isOpen={Boolean(reschedulingApt)}
        onClose={() => {
          setReschedulingApt(null);
          setRescheduleError('');
        }}
        title="Reschedule Appointment"
        description="Select a new date and open time window for your visit."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReschedulingApt(null);
                setRescheduleError('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!newTime}
              isLoading={isRescheduling}
              onClick={handleConfirmReschedule}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Confirm New Schedule
            </Button>
          </>
        }
      >
        {reschedulingApt && (
          <div className="space-y-4 text-xs">
            {rescheduleError && (
              <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400 block mb-1">Current Reservation:</span>
              <p className="font-semibold text-neutral-200">
                {reschedulingApt.service?.name} with {reschedulingApt.barber?.fullName} on{' '}
                {reschedulingApt.appointmentDate} at {reschedulingApt.startTime}
              </p>
            </div>

            <div>
              <label className="text-neutral-300 font-medium block mb-1">Choose New Date</label>
              <input
                type="date"
                value={newDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  setNewTime('');
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-neutral-300 font-medium block mb-1.5">
                Available Times on Selected Date ({reschedulingApt.service?.durationMinutes} mins)
              </label>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-6 text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                  <span>Checking open time slots...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableSlots.map((slot: string) => {
                    const isSelected = newTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                          isSelected
                            ? 'border-amber-500 bg-amber-600 text-neutral-950 font-bold'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-200 hover:border-neutral-700'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-center text-neutral-400">
                  No open slots for this date. Please pick a different date.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};