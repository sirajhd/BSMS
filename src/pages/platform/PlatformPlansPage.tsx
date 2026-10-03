import React, { useEffect, useState } from 'react';
import { platformApi } from '../../api/platform.api';
import type { Plan, Subscription } from '../../types';
import { Plus, Check, X } from 'lucide-react';

export const PlatformPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    slug: '',
    description: '',
    price: 999,
    maxBarbers: 5,
    maxMonthlyAppointments: 500,
    features: 'ONLINE_BOOKING, APPOINTMENTS, REPORTS, WALK_INS',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [plansData, subsData] = await Promise.all([
        platformApi.getPlans(),
        platformApi.getSubscriptions(),
      ]);
      setPlans(plansData);
      setSubscriptions(subsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await platformApi.createPlan({
        ...newPlan,
        features: newPlan.features.split(',').map((f) => f.trim()),
      });
      setModalOpen(false);
      setNewPlan({
        name: '',
        slug: '',
        description: '',
        price: 999,
        maxBarbers: 5,
        maxMonthlyAppointments: 500,
        features: 'ONLINE_BOOKING, APPOINTMENTS, REPORTS, WALK_INS',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">SaaS Plans &amp; Subscriptions</h1>
          <p className="text-sm text-slate-400">
            Define subscription tiers, chair limits, monthly booking caps, and feature entitlements.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Subscription Plan</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-lg text-slate-100">{p.name}</h3>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {p.slug}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">{p.description || 'Standard tier'}</p>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-slate-100">{p.price} ETB</span>
                    <span className="text-xs text-slate-400 ml-1">/ {p.interval.toLowerCase()}</span>
                  </div>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Up to <strong>{p.maxBarbers}</strong> Barbers / Chairs</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Up to <strong>{p.maxMonthlyAppointments}</strong> Appointments/mo</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Multi-Tenant Hostname Routing</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Subscribers: <strong>{p._count?.subscriptions || 0}</strong></span>
                  <span className="text-emerald-400 font-semibold">Active Tier</span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Subscriptions Ledger */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden backdrop-blur-xl shadow-xl space-y-4 p-6">
            <h2 className="text-base font-bold text-slate-100">Tenant Subscriptions Ledger</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Period Start</th>
                    <th className="px-4 py-3">Period End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {subscriptions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {sub.tenant?.name} ({sub.tenant?.slug})
                      </td>
                      <td className="px-4 py-3 text-amber-400 font-medium">
                        {sub.plan?.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {new Date(sub.currentPeriodStart).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-100 mb-4">Create New Subscription Tier</h2>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Elite"
                    value={newPlan.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                      setNewPlan({ ...newPlan, name, slug: newPlan.slug || slug });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="enterprise"
                    value={newPlan.slug}
                    onChange={(e) => setNewPlan({ ...newPlan, slug: e.target.value.toLowerCase() })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (ETB) *</label>
                  <input
                    type="number"
                    required
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Barbers</label>
                  <input
                    type="number"
                    value={newPlan.maxBarbers}
                    onChange={(e) => setNewPlan({ ...newPlan, maxBarbers: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Bookings</label>
                  <input
                    type="number"
                    value={newPlan.maxMonthlyAppointments}
                    onChange={(e) => setNewPlan({ ...newPlan, maxMonthlyAppointments: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Plan features description..."
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500"
                >
                  {isSubmitting ? 'Saving...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
