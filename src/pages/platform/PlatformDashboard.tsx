import React, { useEffect, useState } from 'react';
import { platformApi } from '../../api/platform.api';
import type { PlatformOverview } from '../../types';
import {
  Building2,
  Users,
  CalendarCheck,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PlatformDashboard: React.FC = () => {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const data = await platformApi.getOverview();
        setOverview(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch platform metrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800 text-red-300">
        <p className="font-semibold">Unable to load platform overview</p>
        <p className="text-sm opacity-80 mt-1">{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Businesses',
      value: overview.totalTenants,
      subtitle: `${overview.activeTenants} active, ${overview.suspendedTenants} suspended`,
      icon: Building2,
      color: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Platform Users',
      value: overview.totalUsers,
      subtitle: 'Across all registered barber shops',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Total Bookings',
      value: overview.totalAppointments,
      subtitle: 'System-wide appointment volume',
      icon: CalendarCheck,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Gross Shop Revenue',
      value: `${overview.totalRevenue.toLocaleString()} ETB`,
      subtitle: 'Collected across shops',
      icon: CreditCard,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            Platform Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Global overview of all multi-tenant barber businesses, subscriptions, and system activity.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/platform/businesses"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Business</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden shadow-lg group hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">
                  {card.value}
                </span>
                <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Businesses Section */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Recently Registered Businesses</h2>
            <p className="text-xs text-slate-400">Latest shops provisioned on the platform</p>
          </div>
          <Link
            to="/platform/businesses"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/60 overflow-x-auto">
          {overview.recentTenants.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No businesses found.</p>
          ) : (
            overview.recentTenants.map((t) => (
              <div key={t.id} className="py-3.5 flex items-center justify-between min-w-[500px]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700">
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">{t.name}</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {t.slug}.bsms.com
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-300">
                      {t.plan?.name || 'Pro Plan'}
                    </span>
                    <span className="text-[11px] block text-slate-400">{t.currency}</span>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      t.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {t.status}
                  </span>

                  <Link
                    to={`/platform/businesses/${t.id}`}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security & Multi-Tenancy Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80">
          <div className="flex items-center space-x-3 mb-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-200">Tenant Isolation Enforced</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All appointments, customer registries, barber chairs, and payment ledgers are strictly bounded by cryptographic tenant identifiers with backend-level query scoping.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80">
          <div className="flex items-center space-x-3 mb-3">
            <Building2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-slate-200">Subdomain Host Routing</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Requests are resolved via hostnames (<code className="text-amber-400 font-mono">*.bsms.com</code> &amp; <code className="text-amber-400 font-mono">*.localhost</code>) ensuring clean domain-level separation between different shops.
          </p>
        </div>
      </div>
    </div>
  );
};
