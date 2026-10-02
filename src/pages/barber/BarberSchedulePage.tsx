import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { appointmentsApi } from '../../api/appointments.api';
import type { Appointment } from '../../types';
import { Calendar, Clock, Scissors, User, Phone, Filter, Loader2 } from 'lucide-react';

export const BarberSchedulePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadAppointments = async () => {
      setIsLoading(true);
      try {
        const data = await appointmentsApi.getAppointments({
          date: selectedDate || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        });
        if (isMounted) {
          setAppointments(data || []);
        }
      } catch {
        if (isMounted) {
          setAppointments([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAppointments();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, statusFilter]);

  const filteredAppointments = appointments;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <Calendar className="w-7 h-7 text-amber-500" />
          <span>My Master Schedule</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Complete historical and future booking timeline assigned to your chair.
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-neutral-800 bg-neutral-900/80 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>Filter Schedule:</span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="LATE">Late</option>
              <option value="NO_SHOW">No Show</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {(selectedDate || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setStatusFilter('ALL');
                }}
                className="text-xs text-amber-500 hover:text-amber-400 font-medium px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Appointment Timeline List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
          <span>Loading appointment schedule...</span>
        </div>
      ) : filteredAppointments.length > 0 ? (
        <div className="space-y-3">
          {filteredAppointments.map((apt: Appointment) => (
            <Card
              key={apt.id}
              className="border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge status={apt.status} />
                    <Badge status={apt.paymentStatus} />
                    <span className="text-xs font-mono text-neutral-400">{apt.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-amber-500" />
                    <span>{apt.service?.name}</span>
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{apt.appointmentDate}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{apt.startTime} - {apt.endTime} ({apt.service?.durationMinutes} mins)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{apt.customer?.fullName || 'Walk-in'}</span>
                    </span>
                    {apt.customer?.phone && (
                      <span className="flex items-center gap-1 text-neutral-400">
                        <Phone className="w-3 h-3 text-neutral-500" />
                        <span>{apt.customer.phone}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-neutral-800 pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Total</span>
                  <span className="text-lg font-black text-amber-500">
                    {apt.service?.price} ETB
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Appointments Found"
          description="There are no schedule entries matching the chosen date and status filter."
          icon={<Calendar className="w-10 h-10 stroke-1 text-neutral-500" />}
        />
      )}
    </div>
  );
};