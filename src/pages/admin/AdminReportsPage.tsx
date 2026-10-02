import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { appointmentsApi } from '../../api/appointments.api';
import { barbersApi } from '../../api/barbers.api';
import type { Appointment, Barber } from '../../types';
import {
  FileSpreadsheet,
  Download,
  CreditCard,
  Banknote,
  DollarSign,
  TrendingUp,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'MONTH'>('ALL');

  useEffect(() => {
    let isMounted = true;
    const fetchReportData = async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const [apts, barbs] = await Promise.all([
          appointmentsApi.getAppointments(),
          barbersApi.getBarbers(true),
        ]);
        if (isMounted) {
          setAppointments(apts || []);
          setBarbers(barbs || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setApiError(err?.message || 'Failed to load reporting data.');
          setAppointments([]);
          setBarbers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReportData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter appointments by selected date timeframe
  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7); // 'YYYY-MM'

    return appointments.filter((apt) => {
      if (dateFilter === 'TODAY') return apt.appointmentDate === todayStr;
      if (dateFilter === 'MONTH') return apt.appointmentDate.startsWith(currentMonth);
      return true;
    });
  }, [appointments, dateFilter]);

  // Aggregate metrics
  const completedAppointments = useMemo(
    () => filteredAppointments.filter((apt) => apt.status === 'COMPLETED'),
    [filteredAppointments]
  );

  const totalGrossRevenueETB = useMemo(
    () =>
      completedAppointments.reduce(
        (sum, apt) => sum + (apt.service?.price || 0),
        0
      ),
    [completedAppointments]
  );

  const onlineCollectedETB = useMemo(
    () =>
      completedAppointments
        .filter((apt) => apt.paymentMethod === 'ONLINE')
        .reduce((sum, apt) => sum + (apt.service?.price || 0), 0),
    [completedAppointments]
  );

  const shopCollectedETB = useMemo(
    () =>
      completedAppointments
        .filter((apt) => apt.paymentMethod === 'PAY_AT_SHOP')
        .reduce((sum, apt) => sum + (apt.service?.price || 0), 0),
    [completedAppointments]
  );

  const pendingCollectionETB = useMemo(
    () =>
      filteredAppointments
        .filter(
          (apt) =>
            apt.paymentStatus === 'PENDING' &&
            apt.status !== 'CANCELLED' &&
            apt.status !== 'NO_SHOW'
        )
        .reduce((sum, apt) => sum + (apt.service?.price || 0), 0),
    [filteredAppointments]
  );

  // Barber Performance Breakdown
  const barberPerformance = useMemo(() => {
    return barbers.map((barber) => {
      const barberCompleted = completedAppointments.filter(
        (apt) => apt.barberId === barber.id
      );
      const revenue = barberCompleted.reduce(
        (acc, apt) => acc + (apt.service?.price || 0),
        0
      );
      return {
        id: barber.id,
        name: barber.fullName,
        completedCount: barberCompleted.length,
        revenueETB: revenue,
      };
    });
  }, [barbers, completedAppointments]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Appointment ID',
      'Date',
      'Time Slot',
      'Customer',
      'Phone',
      'Service',
      'Duration (Mins)',
      'Price (ETB)',
      'Master Barber',
      'Appointment Status',
      'Payment Method',
      'Payment Status',
    ];

    const rows = filteredAppointments.map((apt: Appointment) => [
      `"${apt.id}"`,
      `"${apt.appointmentDate}"`,
      `"${apt.startTime} - ${apt.endTime}"`,
      `"${apt.customer?.fullName || 'Walk-in Client'}"`,
      `"${apt.customer?.phone || 'N/A'}"`,
      `"${apt.service?.name || 'N/A'}"`,
      `"${apt.service?.durationMinutes || 0}"`,
      `"${apt.service?.price || 0}"`,
      `"${apt.barber?.fullName || 'N/A'}"`,
      `"${apt.status}"`,
      `"${apt.paymentMethod}"`,
      `"${apt.paymentStatus}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BSMS_Financial_Report_${dateFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header and Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-amber-500" />
            <span>Financial Reports & Revenue Aggregations</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Reconcile shop intake, payment channel splits, and individual barber productivity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                dateFilter === 'ALL'
                  ? 'bg-amber-600 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('MONTH')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                dateFilter === 'MONTH'
                  ? 'bg-amber-600 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('TODAY')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                dateFilter === 'TODAY'
                  ? 'bg-amber-600 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Today
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
          <span>Loading analytics and report summaries...</span>
        </div>
      ) : (
        <>
          {/* Primary Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-neutral-800 bg-neutral-900/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  Gross Realized Revenue
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-amber-500 mt-2 block">
                {totalGrossRevenueETB.toLocaleString()}{' '}
                <span className="text-xs font-normal text-neutral-400">ETB</span>
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">
                From {completedAppointments.length} fulfilled services
              </span>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  Pay at Shop Settled
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-400 mt-2 block">
                {shopCollectedETB.toLocaleString()}{' '}
                <span className="text-xs font-normal text-neutral-400">ETB</span>
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">Physical register receipts</span>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  Digital / Online Paid
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-blue-400 mt-2 block">
                {onlineCollectedETB.toLocaleString()}{' '}
                <span className="text-xs font-normal text-neutral-400">ETB</span>
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">Prepaid digital checkout</span>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/90 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  Pending Counter Receivables
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-black text-neutral-100 mt-2 block">
                {pendingCollectionETB.toLocaleString()}{' '}
                <span className="text-xs font-normal text-neutral-400">ETB</span>
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 block">Active upcoming bookings</span>
            </Card>
          </div>

          {/* Barber Productivity Breakdown Table */}
          <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>Master Barber Productivity & Revenue Distribution</span>
              </h2>
              <span className="text-xs text-neutral-400">
                Based on current {dateFilter.toLowerCase()} filter
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 font-semibold">
                    <th className="pb-3 pr-4">Master Barber</th>
                    <th className="pb-3 pr-4 text-center">Completed Appointments</th>
                    <th className="pb-3 pr-4 text-right">Revenue Generated</th>
                    <th className="pb-3 text-right">Shop Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {barberPerformance.map((bp) => {
                    const percentage =
                      totalGrossRevenueETB > 0
                        ? Math.round((bp.revenueETB / totalGrossRevenueETB) * 100)
                        : 0;

                    return (
                      <tr key={bp.id} className="hover:bg-neutral-800/30">
                        <td className="py-3 pr-4 font-semibold text-neutral-200">
                          {bp.name}
                        </td>
                        <td className="py-3 pr-4 text-center text-neutral-300">
                          {bp.completedCount}
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-amber-500">
                          {bp.revenueETB.toLocaleString()} ETB
                        </td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 font-mono text-neutral-300 font-semibold">
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};