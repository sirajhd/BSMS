import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { servicesApi } from '../../api/services.api';
import { barbersApi } from '../../api/barbers.api';
import { availabilityApi } from '../../api/availability.api';
import { appointmentsApi } from '../../api/appointments.api';
import type {
  Service,
  Barber,
  PaymentMethod,
  Appointment,
} from '../../types';
import {
  Scissors,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export const CustomerBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Wizard Steps: 1: Service, 2: Barber, 3: Date & Time, 4: Review & Payment, 5: Confirmation
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Entities loaded from backend
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PAY_AT_SHOP');

  // Slots State
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string>('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Load initial services, barbers, and customer appointments
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [srvList, barbList, aptList] = await Promise.all([
          servicesApi.getServices(false),
          barbersApi.getBarbers(false),
          appointmentsApi.getAppointments().catch(() => []),
        ]);
        if (isMounted) {
          setServices(srvList || []);
          setBarbers(barbList || []);
          setCustomerAppointments(aptList || []);

          const srvParam = searchParams.get('serviceId');
          if (srvParam && srvList?.some((s) => s.id === srvParam && s.isActive)) {
            setSelectedServiceId(srvParam);
            setCurrentStep(2);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setConflictError(err.message || 'Failed to load booking catalog.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingInitial(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Enforce rule: Customer can have only ONE active or upcoming appointment
  const existingActiveAppointment = useMemo(() => {
    return customerAppointments.find(
      (apt: Appointment) =>
        apt.status === 'CONFIRMED' ||
        apt.status === 'CHECKED_IN' ||
        apt.status === 'IN_PROGRESS' ||
        apt.status === 'RESCHEDULED'
    );
  }, [customerAppointments]);

  // Filter active entities
  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);
  const activeBarbers = useMemo(() => barbers.filter((b) => b.isActive), [barbers]);

  const selectedService = useMemo(
    () => activeServices.find((s) => s.id === selectedServiceId),
    [activeServices, selectedServiceId]
  );

  const selectedBarber = useMemo(
    () => activeBarbers.find((b) => b.id === selectedBarberId),
    [activeBarbers, selectedBarberId]
  );

  // Fetch available slots from backend whenever service, barber, or date changes
  useEffect(() => {
    if (!selectedServiceId || !selectedBarberId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const res = await availabilityApi.getAvailableSlots(
          selectedServiceId,
          selectedBarberId,
          selectedDate
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
  }, [selectedServiceId, selectedBarberId, selectedDate]);

  // Calculate appointment end time
  const calculatedEndTime = useMemo(() => {
    if (!selectedTime || !selectedService) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    const totalMins = h * 60 + m + selectedService.durationMinutes;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }, [selectedTime, selectedService]);

  // Handle final booking submission to backend
  const handleConfirmBooking = async () => {
    setConflictError('');

    if (existingActiveAppointment) {
      setConflictError(
        'You already have an active appointment scheduled. System policy permits only one active reservation at a time. Please reschedule or cancel your current appointment first.'
      );
      return;
    }

    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      setConflictError('Incomplete booking information. Please verify all steps.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await appointmentsApi.bookAppointment({
        serviceId: selectedService.id,
        barberId: selectedBarber.id,
        appointmentDate: selectedDate,
        startTime: selectedTime,
        paymentMethod,
        notes: 'Online customer reservation',
      });

      setConfirmedAppointment(created);
      setIsSubmitting(false);
      setCurrentStep(5);
    } catch (err: any) {
      setIsSubmitting(false);
      setConflictError(
        err.message ||
          'This specific time slot is no longer available. Please select an alternate available time.'
      );
      if (err.code === 'APPOINTMENT_CONFLICT') {
        setSelectedTime('');
        setCurrentStep(3);
      }
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm">Loading booking catalog...</span>
      </div>
    );
  }

  // Guard: If customer already has an active booking, present alert before proceeding
  if (existingActiveAppointment && currentStep < 5) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-amber-600/40 bg-neutral-900/90 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/10 text-amber-500 border border-amber-600/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-100 mb-2">Active Appointment Limit Reached</h2>
          <p className="text-sm text-neutral-300 max-w-lg mx-auto mb-6 leading-relaxed">
            You currently hold a reservation for{' '}
            <strong className="text-amber-400">{existingActiveAppointment.service?.name}</strong> on{' '}
            <strong className="text-neutral-100">{existingActiveAppointment.appointmentDate}</strong> at{' '}
            <strong className="text-neutral-100">{existingActiveAppointment.startTime}</strong> with{' '}
            <strong className="text-neutral-100">{existingActiveAppointment.barber?.fullName}</strong>.
          </p>
          <p className="text-xs text-neutral-400 mb-6">
            Under shop policy, clients may keep one active reservation at a time. To change your slot, please manage your existing appointment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/customer/appointments" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                Manage Existing Appointment
              </Button>
            </Link>
            <Link to="/customer/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Wizard Progress Stepper */}
      {currentStep < 5 && (
        <div className="border-b border-neutral-800 pb-4">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-400 mb-2">
            <span>Step {currentStep} of 4</span>
            <span className="text-amber-500">
              {currentStep === 1 && 'Select Service'}
              {currentStep === 2 && 'Select Master Barber'}
              {currentStep === 3 && 'Choose Date & Slot'}
              {currentStep === 4 && 'Review & Payment'}
            </span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Conflict Error Display */}
      {conflictError && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 flex items-start gap-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">{conflictError}</div>
        </div>
      )}

      {/* STEP 1: Select Service */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-amber-500" />
              <span>Choose Your Service</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Select the grooming service or package you wish to schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeServices.map((service: Service) => {
              const isSelected = selectedServiceId === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-600/10'
                      : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">{service.name}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">{service.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-neutral-300">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{service.durationMinutes} mins</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                      <span className="text-base font-extrabold text-amber-500 block">
                        {service.price} ETB
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              variant="primary"
              disabled={!selectedServiceId}
              onClick={() => setCurrentStep(2)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Barber
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Barber */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              <span>Select Your Barber</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Pick the master craftsman to provide your service.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeBarbers.map((barber: Barber) => {
              const isSelected = selectedBarberId === barber.id;
              return (
                <div
                  key={barber.id}
                  onClick={() => setSelectedBarberId(barber.id)}
                  className={`cursor-pointer p-5 rounded-xl border flex items-center gap-4 transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-600/10'
                      : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500 shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100">{barber.fullName}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{barber.phone}</p>
                    <span className="inline-block mt-2 text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      Available for booking
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!selectedBarberId}
              onClick={() => setCurrentStep(3)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Select Date & Slot
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Select Date & Available Time */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>Choose Date & Time</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Select your appointment date to load real-time available time windows.
            </p>
          </div>

          {/* Date Picker Input */}
          <div className="max-w-xs">
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">
              Appointment Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Available Slots Display */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-2">
              Available Times ({selectedService?.durationMinutes} min service)
            </label>

            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-6 text-neutral-400">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500 mr-2" />
                <span>Checking open chair slots...</span>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {availableSlots.map((slot: string) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                        isSelected
                          ? 'border-amber-500 bg-amber-600 text-neutral-950 font-bold'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center bg-neutral-900/40">
                <Clock className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-300">No Open Slots on Selected Date</p>
                <p className="text-xs text-neutral-400 mt-1">
                  The barber is either fully booked or closed on this weekday. Please select a different date.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              disabled={!selectedTime}
              onClick={() => setCurrentStep(4)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Review Booking
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Review Appointment & Select Payment Method */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-500" />
              <span>Review & Confirm Details</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Please double-check your appointment reservation summary.
            </p>
          </div>

          <Card className="border-neutral-800 bg-neutral-900/90 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Selected Service</span>
                <span className="text-sm font-bold text-neutral-100">{selectedService?.name}</span>
                <p className="text-neutral-400 mt-0.5">{selectedService?.description}</p>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Master Barber</span>
                <span className="text-sm font-bold text-neutral-100">{selectedBarber?.fullName}</span>
                <p className="text-neutral-400 mt-0.5">{selectedBarber?.phone}</p>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Appointment Schedule</span>
                <span className="text-sm font-bold text-neutral-100">
                  {selectedDate} at {selectedTime} - {calculatedEndTime}
                </span>
                <span className="text-neutral-400 block mt-0.5">
                  Duration: {selectedService?.durationMinutes} minutes
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Total Amount</span>
                <span className="text-xl font-black text-amber-500">
                  {selectedService?.price} ETB
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-neutral-200 block mb-3">
                Select Payment Option
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setPaymentMethod('PAY_AT_SHOP')}
                  className={`cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all ${
                    paymentMethod === 'PAY_AT_SHOP'
                      ? 'border-amber-500 bg-amber-600/10'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-neutral-100 block">Pay at Shop</span>
                    <span className="text-[11px] text-neutral-400">
                      Settle payment directly at the shop counter.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-amber-500 bg-amber-600/10'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-neutral-100 block">Pay Online</span>
                    <span className="text-[11px] text-neutral-400">
                      Seamless digital payment checkout.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(3)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleConfirmBooking}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Confirm & Book Appointment
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Booking Confirmation Card */}
      {currentStep === 5 && confirmedAppointment && (
        <Card className="border-emerald-600/40 bg-neutral-900/95 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Reservation Confirmed
            </span>
            <h2 className="text-2xl font-extrabold text-neutral-100 mt-1">
              You're on the books!
            </h2>
            <p className="text-xs text-neutral-400 mt-1.5">
              Appointment reference: <strong className="text-neutral-200">{confirmedAppointment.id}</strong>
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400">Service:</span>
              <span className="font-semibold text-neutral-200">{confirmedAppointment.service?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Master Barber:</span>
              <span className="font-semibold text-neutral-200">{confirmedAppointment.barber?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Date & Time:</span>
              <span className="font-semibold text-neutral-200">
                {confirmedAppointment.appointmentDate} at {confirmedAppointment.startTime} - {confirmedAppointment.endTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Payment:</span>
              <span className="font-semibold text-amber-500">
                {confirmedAppointment.service?.price} ETB ({confirmedAppointment.paymentMethod.replace(/_/g, ' ')})
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/customer/dashboard" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                View in Dashboard
              </Button>
            </Link>
            <Link to="/customer/appointments" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full">
                My Appointments
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};