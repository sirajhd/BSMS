import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { appointmentsApi } from '../../api/appointments.api';
import type { Appointment, AppointmentStatus } from '../../types';
import {
  CalendarCheck,
  Clock,
  Play,
  CheckCircle,
  UserCheck,
  AlertCircle,
  UserX,
  UserPlus,
  Scissors,
  Phone,
  Loader2,
} from 'lucide-react';

export const BarberDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const loadAppointments = async () => {
    try {
      const data = await appointmentsApi.getAppointments();
      setAppointments(data || []);
    } catch {
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Queue categorizations
  const inProgressApt = useMemo(
    () => appointments.find((apt) => apt.status === 'IN_PROGRESS'),
    [appointments]
  );

  const upcomingQueue = useMemo(
    () =>
      appointments.filter((apt) =>
        ['CONFIRMED', 'CHECKED_IN', 'LATE', 'RESCHEDULED'].includes(apt.status)
      ),
    [appointments]
  );

  const completedQueue = useMemo(
    () =>
      appointments.filter((apt) =>
        ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(apt.status)
      ),
    [appointments]
  );

  // Handle allowed status transitions
  const handleUpdateStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setStatusUpdatingId(appointmentId);
    try {
      await appointmentsApi.updateStatus(appointmentId, newStatus);
      await loadAppointments();
    } catch {
      // reload to ensure consistency
      await loadAppointments();
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span>Loading workstation schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-amber-500" />
            <span>Barber Workstation</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your daily chair queue, check in arrivals, and record finished cuts.
          </p>
        </div>

        <Link to="/barber/walk-in">
          <Button variant="primary" size="md" leftIcon={<UserPlus className="w-4 h-4" />}>
            New Walk-In Client
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-neutral-800 bg-neutral-900/80 p-4">
          <span className="text-xs text-neutral-400 font-medium block">Total Assigned</span>
          <span className="text-2xl font-black text-neutral-100 mt-1 block">
            {appointments.length}
          </span>
        </Card>

        <Card className="border-amber-600/30 bg-amber-950/20 p-4">
          <span className="text-xs text-amber-400 font-medium block">In Chair Now</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {inProgressApt ? '1 Active' : 'None'}
          </span>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/80 p-4">
          <span className="text-xs text-neutral-400 font-medium block">Waiting in Queue</span>
          <span className="text-2xl font-black text-neutral-100 mt-1 block">
            {upcomingQueue.length}
          </span>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/80 p-4">
          <span className="text-xs text-neutral-400 font-medium block">Finished Today</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {completedQueue.filter((a) => a.status === 'COMPLETED').length}
          </span>
        </Card>
      </div>

      {/* SECTION 1: Current In-Chair Service */}
      {inProgressApt && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Currently Serving</span>
          </h2>

          <Card className="border-amber-500/50 bg-neutral-900 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge status={inProgressApt.status} />
                  <Badge status={inProgressApt.paymentStatus} />
                  <span className="text-xs text-neutral-400">
                    Ref: <strong className="text-neutral-300 font-mono">{inProgressApt.id}</strong>
                  </span>
                </div>

                <h3 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-amber-500" />
                  <span>{inProgressApt.service?.name}</span>
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300 pt-1">
                  <span>Client: <strong className="text-white">{inProgressApt.customer?.fullName || 'Walk-in'}</strong></span>
                  <span>Scheduled: <strong className="text-white">{inProgressApt.startTime} - {inProgressApt.endTime}</strong></span>
                  <span>Amount: <strong className="text-amber-500">{inProgressApt.service?.price} ETB</strong></span>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                isLoading={statusUpdatingId === inProgressApt.id}
                onClick={() => handleUpdateStatus(inProgressApt.id, 'COMPLETED')}
                leftIcon={<CheckCircle className="w-4 h-4" />}
                className="shrink-0"
              >
                Complete Cut
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* SECTION 2: Active Waiting Queue */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <span>Waiting & Upcoming Queue ({upcomingQueue.length})</span>
        </h2>

        {upcomingQueue.length > 0 ? (
          <div className="space-y-3">
            {upcomingQueue.map((apt: Appointment) => (
              <Card
                key={apt.id}
                className="border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge status={apt.status} />
                      <Badge status={apt.paymentStatus} />
                      <span className="text-xs font-mono text-neutral-400">{apt.id}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <h3 className="text-base font-bold text-neutral-100">{apt.service?.name}</h3>
                      <span className="text-xs font-semibold text-amber-500">
                        {apt.service?.price} ETB
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                      <span>Time: <strong className="text-neutral-200">{apt.startTime} - {apt.endTime}</strong></span>
                      <span>Client: <strong className="text-neutral-200">{apt.customer?.fullName || 'Walk-in'}</strong></span>
                      {apt.customer?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-neutral-500" />
                          <span>{apt.customer.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contextual Barber Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                    {apt.status === 'CONFIRMED' && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          isLoading={statusUpdatingId === apt.id}
                          onClick={() => handleUpdateStatus(apt.id, 'CHECKED_IN')}
                          leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                        >
                          Check In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={statusUpdatingId === apt.id}
                          onClick={() => handleUpdateStatus(apt.id, 'LATE')}
                          leftIcon={<AlertCircle className="w-3.5 h-3.5" />}
                        >
                          Mark Late
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={statusUpdatingId === apt.id}
                          onClick={() => handleUpdateStatus(apt.id, 'NO_SHOW')}
                          leftIcon={<UserX className="w-3.5 h-3.5" />}
                        >
                          No Show
                        </Button>
                      </>
                    )}

                    {(apt.status === 'CHECKED_IN' || apt.status === 'LATE') && (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={statusUpdatingId === apt.id}
                        onClick={() => handleUpdateStatus(apt.id, 'IN_PROGRESS')}
                        leftIcon={<Play className="w-3.5 h-3.5" />}
                      >
                        Start Service
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Queue is Clear"
            description="No pending clients are waiting in your queue. Ready for walk-in arrivals."
            icon={<CalendarCheck className="w-10 h-10 stroke-1 text-neutral-500" />}
          />
        )}
      </section>

      {/* SECTION 3: Completed / Finished Log */}
      {completedQueue.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-400">
            Recent Service Log ({completedQueue.length})
          </h2>

          <div className="space-y-2">
            {completedQueue.map((apt: Appointment) => (
              <div
                key={apt.id}
                className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <Badge status={apt.status} size="sm" />
                  <span className="font-semibold text-neutral-200">{apt.service?.name}</span>
                  <span className="text-neutral-400">({apt.customer?.fullName || 'Walk-in'})</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-400">
                  <span>{apt.startTime}</span>
                  <span className="font-semibold text-neutral-300">{apt.service?.price} ETB</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};