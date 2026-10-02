import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { appointmentsApi } from '../../api/appointments.api';
import type { Appointment } from '../../types';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  ArrowRight,
  PlusCircle,
  History,
  Sparkles,
  Loader2,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadAppointments = async () => {
      try {
        const data = await appointmentsApi.getAppointments();
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
  }, []);

  // Find the next active/upcoming appointment for this customer
  const upcomingAppointment = appointments.find(
    (apt: Appointment) =>
      apt.status === 'CONFIRMED' ||
      apt.status === 'CHECKED_IN' ||
      apt.status === 'IN_PROGRESS' ||
      apt.status === 'RESCHEDULED'
  );

  const customerName =
    profile && 'fullName' in profile && profile.fullName
      ? profile.fullName
      : user?.email?.split('@')[0] || 'Valued Client';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span>Loading your customer dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100">
            Welcome back, <span className="text-amber-500">{customerName}</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your cuts, view your barber schedule, and track reservations.
          </p>
        </div>
        <Link to="/customer/book">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Book New Cut
          </Button>
        </Link>
      </div>

      {/* Hero Section: Next Upcoming Appointment */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span>Next Appointment</span>
          </h2>
          {upcomingAppointment && (
            <Link
              to="/customer/appointments"
              className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {upcomingAppointment ? (
          <Card className="border-amber-600/30 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge status={upcomingAppointment.status} />
                  <Badge status={upcomingAppointment.paymentStatus} />
                  <span className="text-xs text-neutral-400 flex items-center gap-1 ml-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Duration: {upcomingAppointment.service?.durationMinutes} mins</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-amber-500" />
                    <span>{upcomingAppointment.service?.name}</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                    {upcomingAppointment.service?.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Date: <strong className="text-neutral-100">{upcomingAppointment.appointmentDate}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Time: <strong className="text-neutral-100">{upcomingAppointment.startTime} - {upcomingAppointment.endTime}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <User className="w-4 h-4 text-amber-500" />
                    <span>Master Barber: <strong className="text-neutral-100">{upcomingAppointment.barber?.fullName}</strong></span>
                  </div>
                </div>
              </div>

              {/* Price & Action Box */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6 gap-3 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-xs text-neutral-400 uppercase tracking-wider block">Service Total</span>
                  <span className="text-2xl font-black text-amber-500">
                    {upcomingAppointment.service?.price} <span className="text-xs font-normal text-neutral-400">ETB</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link to="/customer/appointments" className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage / Reschedule
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No Upcoming Appointment"
            description="You don't have any scheduled appointments on the books right now. Ready for a clean fade or beard trim?"
            icon={<Sparkles className="w-10 h-10 stroke-1 text-amber-500" />}
            action={
              <Link to="/customer/book">
                <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Book Appointment Now
                </Button>
              </Link>
            }
          />
        )}
      </section>

      {/* Quick Access Grid */}
      <section className="pt-2">
        <h2 className="text-base font-semibold text-neutral-200 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/customer/book" className="group">
            <Card className="hover:border-neutral-700 transition-colors h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-3 group-hover:bg-amber-600/20 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-neutral-100 text-sm mb-1">Book an Appointment</h3>
                <p className="text-xs text-neutral-400">
                  Select your service, choose your barber, and reserve an open slot.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center text-xs font-medium text-amber-500 group-hover:text-amber-400 gap-1">
                <span>Start booking</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          <Link to="/customer/services" className="group">
            <Card className="hover:border-neutral-700 transition-colors h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-3 group-hover:bg-amber-600/20 transition-colors">
                  <Scissors className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-neutral-100 text-sm mb-1">Browse Services</h3>
                <p className="text-xs text-neutral-400">
                  Explore full cuts, beard trims, razor hot towels, and pricing in ETB.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center text-xs font-medium text-amber-500 group-hover:text-amber-400 gap-1">
                <span>View menu</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          <Link to="/customer/appointments" className="group">
            <Card className="hover:border-neutral-700 transition-colors h-full flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-3 group-hover:bg-amber-600/20 transition-colors">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-neutral-100 text-sm mb-1">Appointment History</h3>
                <p className="text-xs text-neutral-400">
                  Review your past visits, receipts, and payment records.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center text-xs font-medium text-amber-500 group-hover:text-amber-400 gap-1">
                <span>View history</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
};