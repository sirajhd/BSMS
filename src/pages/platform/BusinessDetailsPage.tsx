import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { platformApi } from '../../api/platform.api';
import type { Tenant } from '../../types';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';

export const BusinessDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        const data = await platformApi.getBusinessById(id);
        setBusiness(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch business details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

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

  return (
    <div className="space-y-6">
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current Subscription
          </h2>
          <div className="space-y-2">
            <span className="text-2xl font-black text-slate-100 block">
              {anyBusiness.subscriptions?.[0]?.plan?.name || 'Professional Plan'}
            </span>
            <p className="text-xs text-slate-400">
              Status: <span className="text-emerald-400 font-semibold">{anyBusiness.subscriptions?.[0]?.status || 'ACTIVE'}</span>
            </p>
            <p className="text-xs text-slate-400">
              Price: <span className="text-slate-200 font-bold">{anyBusiness.subscriptions?.[0]?.plan?.price || 1200} ETB / month</span>
            </p>
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
    </div>
  );
};
