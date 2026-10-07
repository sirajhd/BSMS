import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { platformApi } from '../../api/platform.api';
import type { Tenant, Plan } from '../../types';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const BusinessDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Change Plan Modal State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const data = await platformApi.getBusinessById(id);
      setBusiness(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch business details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleOpenPlanModal = async () => {
    setPlanError(null);
    setPlanModalOpen(true);
    setIsLoadingPlans(true);

    try {
      const plans = await platformApi.getPlans();
      // Prefer active plans
      const activePlans = plans.filter((p) => p.isActive !== false);
      setAvailablePlans(activePlans.length > 0 ? activePlans : plans);

      const anyBiz = business as any;
      const currentSlug = anyBiz?.subscriptions?.[0]?.plan?.slug || '';
      setSelectedPlanSlug(currentSlug || (activePlans[0]?.slug ?? plans[0]?.slug ?? 'starter'));
    } catch (err: any) {
      setPlanError(err.message || 'Failed to load available plans');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleChangePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedPlanSlug) return;

    setIsSubmittingPlan(true);
    setPlanError(null);

    try {
      await platformApi.changeBusinessPlan(id, selectedPlanSlug);
      setPlanModalOpen(false);
      setNotification({
        type: 'success',
        message: 'Subscription plan updated successfully.',
      });
      // Refresh business details
      const updatedData = await platformApi.getBusinessById(id);
      setBusiness(updatedData);
    } catch (err: any) {
      setPlanError(err.message || 'Failed to update subscription plan');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-300">
        <p className="font-semibold">Unable to load business details</p>
        <p className="text-sm opacity-80 mt-1">{error}</p>
        <Link to="/platform/businesses" className="mt-4 inline-block text-xs font-bold underline">
          Back to businesses list
        </Link>
      </div>
    );
  }

  const anyBusiness = business as any;
  const currentSubscription = anyBusiness.subscriptions?.[0];
  const currentPlan = currentSubscription?.plan;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Back Button & Header */}
      <div>
        <Link
          to="/platform/businesses"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Businesses</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              {business.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100">{business.name}</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="font-mono text-xs text-amber-400">
                  {business.slug}.bsms.com
                </span>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    business.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {business.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact & Location */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contact &amp; Details
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3 text-slate-300">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{business.email || 'No email provided'}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{business.phone || 'No phone provided'}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>{business.address || 'No physical address provided'}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-300">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>{business.timezone} ({business.currency})</span>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Subscription
            </h2>
            <button
              onClick={handleOpenPlanModal}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 transition flex items-center space-x-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Change Plan</span>
            </button>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-black text-slate-100 block">
              {currentPlan?.name || 'No active plan'}
            </span>
            <p className="text-xs text-slate-400">
              Status:{' '}
              <span
                className={`font-semibold ${
                  currentSubscription?.status === 'ACTIVE'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {currentSubscription?.status || 'INACTIVE'}
              </span>
            </p>
            <p className="text-xs text-slate-400">
              Price:{' '}
              <span className="text-slate-200 font-bold">
                {currentPlan?.price ?? 0} {business.currency || 'ETB'} /{' '}
                {currentPlan?.interval?.toLowerCase() || 'month'}
              </span>
            </p>
            {currentPlan && (
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 flex items-center gap-4">
                <span>
                  Max Barbers:{' '}
                  <strong className="text-slate-200">
                    {currentPlan.maxBarbers}
                  </strong>
                </span>
                <span>
                  Max Appts/mo:{' '}
                  <strong className="text-slate-200">
                    {currentPlan.maxMonthlyAppointments}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Aggregate Volume */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Volume &amp; Capacity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-2xl font-black text-amber-400">
                {anyBusiness._count?.appointments || 0}
              </span>
              <span className="text-xs block text-slate-400">Appointments</span>
            </div>
            <div>
              <span className="text-2xl font-black text-amber-400">
                {anyBusiness.barbers?.length || 0}
              </span>
              <span className="text-xs block text-slate-400">Barbers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff & Members */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-4">
        <h2 className="text-base font-bold text-slate-100">Assigned Team Members &amp; Roles</h2>
        <div className="divide-y divide-slate-800/60">
          {anyBusiness.memberships?.map((m: any) => (
            <div key={m.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-slate-200 block">
                  {m.user?.email}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Member ID: {m.id}
                </span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Change Plan Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPlanModalOpen(false)}
              className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Change Subscription Plan</h2>
                <p className="text-xs text-slate-400">
                  Select a plan tier for <strong className="text-slate-200">{business.name}</strong>
                </p>
              </div>
            </div>

            {planError && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{planError}</span>
              </div>
            )}

            {isLoadingPlans ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <form onSubmit={handleChangePlan} className="space-y-4">
                <div className="space-y-3">
                  {availablePlans.map((p) => {
                    const isSelected = selectedPlanSlug === p.slug;
                    const isCurrent = currentPlan?.slug === p.slug;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanSlug(p.slug)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-slate-100">
                                {p.name}
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                {p.slug}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                                  Current Plan
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              {p.description || 'Standard subscription tier'}
                            </p>
                          </div>

                          <div className="text-right shrink-0 ml-4">
                            <span className="text-base font-black text-slate-100">
                              {p.price} {business.currency || 'ETB'}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              / {p.interval?.toLowerCase() || 'month'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                Max <strong>{p.maxBarbers}</strong> Barbers
                              </span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                Max <strong>{p.maxMonthlyAppointments}</strong> Bookings/mo
                              </span>
                            </span>
                          </div>

                          <input
                            type="radio"
                            name="planSelection"
                            checked={isSelected}
                            onChange={() => setSelectedPlanSlug(p.slug)}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPlanModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPlan || !selectedPlanSlug}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition"
                  >
                    {isSubmittingPlan ? 'Updating Plan...' : 'Confirm Plan Change'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
