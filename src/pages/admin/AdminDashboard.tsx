import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { appointmentsApi } from '../../api/appointments.api';
import { barbersApi } from '../../api/barbers.api';
import { servicesApi } from '../../api/services.api';
import type { Appointment, Barber, Service } from '../../types';
import {
  DollarSign,
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  Users,
  Scissors,
  ArrowRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadDashboardData = async () => {
      try {
        const [apts, barbs, srvs] = await Promise.all([
          appointmentsApi.getAppointments(),
          barbersApi.getBarbers(true),
          servicesApi.getServices(true),
        ]);
        if (isMounted) {
          setAppointments(apts || []);
          setBarbers(barbs || []);
          setServices(srvs || []);
        }
      } catch {
        if (isMounted) {
          setAppointments([]);
          setBarbers([]);
          setServices([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Aggregate KPIs
  const totalAppointments = appointments.length;

  const completedAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.status === 'COMPLETED');
  }, [appointments]);

  const totalGrossRevenueETB = useMemo(() => {
    return completedAppointments.reduce((acc, apt) => {
      return acc + (apt.service?.price || 0);
    }, 0);
  }, [completedAppointments]);

  const cancelledCount = useMemo(() => {
    return appointments.filter(
      (apt) => apt.status === 'CANCELLED' || apt.status === 'NO_SHOW'
    ).length;
  }, [appointments]);

  const cancellationRate = totalAppointments > 0
    ? Math.round((cancelledCount / totalAppointments) * 100)
    : 0;

  const activeBarbersCount = useMemo(() => {
    return barbers.filter((b) => b.isActive).length;
  }, [barbers]);

  const activeServicesCount = useMemo(() => {
    return services.filter((s) => s.isActive).length;
  }, [services]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-amber-500" />
            <span>Executive Analytics & Shop Performance</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time business health indicators, revenue tracking, and appointment analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/appointments">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Master Appointments
            </Button>
          </Link>
          <Link to="/admin/services">
            <Button variant="primary" size="sm">
              Manage Services
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-neutral-800 bg-neutral-900/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-500 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-amber-500 mt-2 block">
            {totalGrossRevenueETB.toLocaleString()} <span className="text-xs font-normal text-neutral-400">ETB</span>
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">From completed visits</span>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Total Bookings
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-neutral-100 mt-2 block">
            {totalAppointments}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">All registered sessions</span>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Completed Cuts
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-400 mt-2 block">
            {completedAppointments.length}
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">Fulfilled successfully</span>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/90 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Cancellation / No-Show
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-neutral-100 mt-2 block">
            {cancellationRate}%
          </span>
          <span className="text-[11px] text-neutral-500 mt-1 block">{cancelledCount} unfulfilled cuts</span>
        </Card>
      </div>

      {/* Operational Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Barber Capacity Status</span>
            </h2>
            <Link to="/admin/barbers" className="text-xs text-amber-500 hover:text-amber-400 font-semibold">
              Manage Roster
            </Link>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-neutral-100 block">{barbers.length}</span>
              <span className="text-xs text-neutral-400">Total Barbers</span>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-emerald-400 block">{activeBarbersCount}</span>
              <span className="text-xs text-neutral-400">Active Stations</span>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-amber-500 block">
                {barbers.length - activeBarbersCount}
              </span>
              <span className="text-xs text-neutral-400">Inactive</span>
            </div>
          </div>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-500" />
              <span>Active Service Offerings</span>
            </h2>
            <Link to="/admin/services" className="text-xs text-amber-500 hover:text-amber-400 font-semibold">
              Configure Menu
            </Link>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-neutral-100 block">{services.length}</span>
              <span className="text-xs text-neutral-400">Total Services</span>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-emerald-400 block">{activeServicesCount}</span>
              <span className="text-xs text-neutral-400">Published to Clients</span>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="text-center">
              <span className="text-3xl font-extrabold text-neutral-500 block">
                {services.length - activeServicesCount}
              </span>
              <span className="text-xs text-neutral-400">Archived/Hidden</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Ledger Activity Table */}
      <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 className="text-sm font-bold text-neutral-200">Recent Master Ledger Records</h2>
          <Link to="/admin/appointments" className="text-xs text-amber-500 hover:text-amber-400 font-semibold">
            View All Records
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
            <span>Loading dashboard records...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs">
            No appointment records found in master ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-semibold">
                  <th className="pb-3 pr-4">Reference</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Master Barber</th>
                  <th className="pb-3 pr-4">Service</th>
                  <th className="pb-3 pr-4">Date & Time</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {appointments.slice(0, 5).map((apt: Appointment) => (
                  <tr key={apt.id} className="hover:bg-neutral-800/30">
                    <td className="py-3 pr-4 font-mono text-neutral-400">{apt.id.substring(0, 8)}...</td>
                    <td className="py-3 pr-4 font-semibold text-neutral-200">
                      {apt.customer?.fullName || 'Walk-in'}
                    </td>
                    <td className="py-3 pr-4 text-neutral-300">{apt.barber?.fullName}</td>
                    <td className="py-3 pr-4 text-neutral-300">{apt.service?.name}</td>
                    <td className="py-3 pr-4 text-neutral-400">
                      {apt.appointmentDate} at {apt.startTime}
                    </td>
                    <td className="py-3 pr-4 font-bold text-amber-500">{apt.service?.price} ETB</td>
                    <td className="py-3">
                      <Badge status={apt.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};