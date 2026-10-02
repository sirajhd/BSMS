import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { servicesApi } from '../../api/services.api';
import { availabilityApi } from '../../api/availability.api';
import { appointmentsApi } from '../../api/appointments.api';
import type {
  Service,
  Appointment,
  PaymentMethod,
  PaymentStatus,
} from '../../types';
import {
  UserPlus,
  Scissors,
  Clock,
  CheckCircle,
  AlertCircle,
  Banknote,
  CreditCard,
  User,
  Phone,
  Loader2,
} from 'lucide-react';

export const BarberWalkInPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const currentBarberId =
    profile && 'id' in profile ? profile.id : '';

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAY_AT_SHOP');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');

  // Slots State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Submissions and alerts
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successAppointment, setSuccessAppointment] = useState<Appointment | null>(null);

  // Load active services
  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      try {
        const data = await servicesApi.getServices(false);
        if (isMounted) {
          setServices(data || []);
          if (data && data.length > 0) {
            setSelectedServiceId(data[0].id);
          }
        }
      } catch {
        if (isMounted) {
          setServices([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingInitial(false);
        }
      }
    };

    fetchServices();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeServices = useMemo(
    () => services.filter((s) => s.isActive),
    [services]
  );
  const selectedService = useMemo(
    () => activeServices.find((s) => s.id === selectedServiceId),
    [activeServices, selectedServiceId]
  );

  // Fetch real available slots for this barber on selected date
  useEffect(() => {
    if (!selectedServiceId || !currentBarberId || !appointmentDate) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const res = await availabilityApi.getAvailableSlots(
          selectedServiceId,
          currentBarberId,
          appointmentDate
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
  }, [selectedServiceId, currentBarberId, appointmentDate]);

  const handleSubmitWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerPhone.trim() || !selectedService || !selectedTime) {
      setErrorMessage('Please fill in all required customer and appointment fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await appointmentsApi.createWalkIn({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceId: selectedService.id,
        barberId: currentBarberId,
        appointmentDate,
        startTime: selectedTime,
        paymentMethod,
        paymentStatus,
      });

      setIsSubmitting(false);
      setSuccessAppointment(created);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to record walk-in appointment.');
      setSelectedTime('');
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span>Loading walk-in console...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <UserPlus className="w-7 h-7 text-amber-500" />
          <span>New Walk-In Appointment</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Create an immediate or same-day reservation for a client currently present at the shop.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 flex items-center gap-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successAppointment ? (
        <Card className="border-emerald-600/40 bg-neutral-900/95 p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Walk-In Successfully Registered
            </span>
            <h2 className="text-2xl font-bold text-neutral-100 mt-1">
              Added to Workstation Queue
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Reference: <strong className="text-neutral-200">{successAppointment.id}</strong>
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400">Client:</span>
              <span className="font-semibold text-neutral-100">{successAppointment.customer?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Service:</span>
              <span className="font-semibold text-neutral-100">{successAppointment.service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Scheduled:</span>
              <span className="font-semibold text-neutral-100">
                {successAppointment.appointmentDate} at {successAppointment.startTime} - {successAppointment.endTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Amount & Status:</span>
              <span className="font-semibold text-amber-500">
                {successAppointment.service?.price} ETB ({successAppointment.paymentStatus})
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSuccessAppointment(null);
                setCustomerName('');
                setCustomerPhone('');
                setSelectedTime('');
              }}
            >
              Add Another Walk-In
            </Button>
            <Link to="/barber/dashboard">
              <Button variant="outline" size="md">
                Go to Queue
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmitWalkIn} className="space-y-6">
          {/* Customer Credentials */}
          <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
            <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider border-b border-neutral-800 pb-2">
              1. Customer Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Customer Full Name"
                placeholder="e.g. Dawit Tsegaye"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label="Phone Number"
                placeholder="+251 91 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                required
              />
            </div>
          </Card>

          {/* Service & Barber Details */}
          <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
            <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider border-b border-neutral-800 pb-2">
              2. Service & Scheduling
            </h2>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Select Service
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeServices.map((service: Service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setSelectedTime('');
                      }}
                      className={`cursor-pointer p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-600/15'
                          : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-neutral-100">{service.name}</span>
                        </div>
                        <span className="text-xs font-extrabold text-amber-500">
                          {service.price} ETB
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        <span>{service.durationMinutes} mins</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Appointment Date
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Assigned Station
                </label>
                <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500" />
                  <span>{profile && 'fullName' in profile ? profile.fullName : 'My Chair'} (Active Station)</span>
                </div>
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="pt-2">
              <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                Available Chair Times ({selectedService?.durationMinutes} mins)
              </label>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-6 text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                  <span>Checking open chair slots...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {availableSlots.map((slot: string) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
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
                <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-400">
                  No slots currently fit this service duration for the selected date.
                </div>
              )}
            </div>
          </Card>

          {/* Payment & Confirmation */}
          <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
            <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider border-b border-neutral-800 pb-2">
              3. Payment Arrangement
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAY_AT_SHOP')}
                    className={`flex-1 p-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 ${
                      paymentMethod === 'PAY_AT_SHOP'
                        ? 'border-amber-500 bg-amber-600/15 text-amber-400 font-bold'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Pay at Shop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ONLINE')}
                    className={`flex-1 p-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 ${
                      paymentMethod === 'ONLINE'
                        ? 'border-amber-500 bg-amber-600/15 text-amber-400 font-bold'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Online</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                  Initial Payment Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('PENDING')}
                    className={`flex-1 p-2.5 rounded-lg text-xs font-medium border text-center ${
                      paymentStatus === 'PENDING'
                        ? 'border-amber-500 bg-amber-600/15 text-amber-400 font-bold'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('PAID')}
                    className={`flex-1 p-2.5 rounded-lg text-xs font-medium border text-center ${
                      paymentStatus === 'PAID'
                        ? 'border-emerald-500 bg-emerald-600/15 text-emerald-400 font-bold'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                    }`}
                  >
                    Paid Counter
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate('/barber/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedTime || !customerName.trim()}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Confirm Walk-In Booking
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};