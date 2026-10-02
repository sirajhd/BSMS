import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { appointmentsApi } from '../../api/appointments.api';
import { barbersApi } from '../../api/barbers.api';
import { paymentsApi } from '../../api/payments.api';
import type {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  Barber,
} from '../../types';
import {
  CalendarCheck,
  Search,
  Filter,
  Sliders,
  Phone,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const AdminAppointmentsPage: React.FC = () => {
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [barbersList, setBarbersList] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Edit / Override Modal State
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [overrideBarberId, setOverrideBarberId] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<AppointmentStatus>('CONFIRMED');
  const [overridePaymentStatus, setOverridePaymentStatus] = useState<PaymentStatus>('PENDING');
  const [isSaving, setIsSaving] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const fetchAppointmentsAndBarbers = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [apts, barbs] = await Promise.all([
        appointmentsApi.getAppointments(),
        barbersApi.getBarbers(true),
      ]);
      setAppointmentsList(apts || []);
      setBarbersList(barbs || []);
    } catch (err: any) {
      setApiError(err?.message || 'Failed to fetch appointment ledger.');
      setAppointmentsList([]);
      setBarbersList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointmentsAndBarbers();
  }, []);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointmentsList.filter((apt) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        apt.id.toLowerCase().includes(q) ||
        (apt.customer?.fullName && apt.customer.fullName.toLowerCase().includes(q)) ||
        (apt.customer?.phone && apt.customer.phone.toLowerCase().includes(q)) ||
        (apt.service?.name && apt.service.name.toLowerCase().includes(q));

      const matchDate = selectedDate ? apt.appointmentDate === selectedDate : true;
      const matchBarber = selectedBarberId === 'ALL' ? true : apt.barberId === selectedBarberId;
      const matchStatus = selectedStatus === 'ALL' ? true : apt.status === selectedStatus;

      return matchSearch && matchDate && matchBarber && matchStatus;
    });
  }, [appointmentsList, searchQuery, selectedDate, selectedBarberId, selectedStatus]);

  const handleOpenOverrideModal = (apt: Appointment) => {
    setEditingAppointment(apt);
    setOverrideBarberId(apt.barberId);
    setOverrideStatus(apt.status);
    setOverridePaymentStatus(apt.paymentStatus);
    setOverrideError(null);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    setIsSaving(true);
    setOverrideError(null);

    try {
      if (overrideStatus !== editingAppointment.status) {
        await appointmentsApi.updateStatus(editingAppointment.id, overrideStatus);
      }

      if (
        overridePaymentStatus !== editingAppointment.paymentStatus &&
        editingAppointment.payment?.id
      ) {
        await paymentsApi.updatePaymentStatus(editingAppointment.payment.id, overridePaymentStatus);
      }

      await fetchAppointmentsAndBarbers();
      setEditingAppointment(null);
    } catch (err: any) {
      setOverrideError(err?.message || 'Failed to apply administrative update.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setSelectedBarberId('ALL');
    setSelectedStatus('ALL');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <CalendarCheck className="w-7 h-7 text-amber-500" />
          <span>Master Appointments Ledger</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Full shop booking register with administrative overrides, barber reassignments, and status controls.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-neutral-800 bg-neutral-900/90 space-y-4 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search client, ID, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-neutral-400" />}
          />

          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 h-10"
            />
          </div>

          <div>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 h-10"
            >
              <option value="ALL">All Master Barbers</option>
              {barbersList.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 h-10"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="LATE">Late</option>
              <option value="NO_SHOW">No Show</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {(searchQuery || selectedDate || selectedBarberId !== 'ALL' || selectedStatus !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
            <span className="text-neutral-400">
              Showing <strong>{filteredAppointments.length}</strong> matching entries
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-amber-500 hover:text-amber-400 font-semibold"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </Card>

      {apiError && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Appointments Ledger Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
          <span>Loading appointment ledger...</span>
        </div>
      ) : filteredAppointments.length > 0 ? (
        <Card className="border-neutral-800 bg-neutral-900/90 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Master Barber</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Price (ETB)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredAppointments.map((apt: Appointment) => (
                  <tr key={apt.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-400 font-medium">
                      {apt.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-100">
                        {apt.customer?.fullName || 'Walk-in Client'}
                      </div>
                      {apt.customer?.phone && (
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{apt.customer.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-neutral-200">
                      <div className="font-medium">{apt.service?.name}</div>
                      <div className="text-[11px] text-neutral-500">
                        {apt.service?.durationMinutes} mins
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {apt.barber?.fullName}
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      <div>{apt.appointmentDate}</div>
                      <div className="text-[11px] text-neutral-500">
                        {apt.startTime} - {apt.endTime}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-500">
                      {apt.service?.price} ETB
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <Badge status={apt.status} size="sm" />
                        <div>
                          <Badge status={apt.paymentStatus} size="sm" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenOverrideModal(apt)}
                        leftIcon={<Sliders className="w-3 h-3" />}
                      >
                        Override
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="No Appointments Match Criteria"
          description="Adjust your search keywords or reset filter dropdowns to view shop reservations."
          icon={<Filter className="w-10 h-10 stroke-1 text-neutral-500" />}
          action={
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          }
        />
      )}

      {/* ADMINISTRATIVE OVERRIDE MODAL */}
      <Modal
        isOpen={Boolean(editingAppointment)}
        onClose={() => setEditingAppointment(null)}
        title={`Administrative Override — ${editingAppointment?.id}`}
        description="Reassign master barber, override operational status, or update payment record."
        maxWidth="md"
      >
        {editingAppointment && (
          <form onSubmit={handleSaveOverride} className="space-y-4 pt-2 text-xs">
            {overrideError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs">
                {overrideError}
              </div>
            )}
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-400">Client:</span>
                <span className="font-semibold text-neutral-200">
                  {editingAppointment.customer?.fullName || 'Walk-in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Service:</span>
                <span className="font-semibold text-neutral-200">
                  {editingAppointment.service?.name} ({editingAppointment.service?.price} ETB)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Scheduled:</span>
                <span className="font-semibold text-neutral-200">
                  {editingAppointment.appointmentDate} at {editingAppointment.startTime}
                </span>
              </div>
            </div>

            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Assigned Master Barber
              </label>
              <select
                value={overrideBarberId}
                onChange={(e) => setOverrideBarberId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {barbersList.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.fullName} {!barber.isActive ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-300 font-semibold block mb-1">
                  Appointment Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as AppointmentStatus)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CHECKED_IN">CHECKED_IN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="RESCHEDULED">RESCHEDULED</option>
                  <option value="LATE">LATE</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">
                  Payment Status
                </label>
                <select
                  value={overridePaymentStatus}
                  onChange={(e) => setOverridePaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingAppointment(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Apply Override
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};