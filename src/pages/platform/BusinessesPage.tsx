import React, { useEffect, useState } from 'react';
import { platformApi } from '../../api/platform.api';
import type { Tenant } from '../../types';
import {
  Building2,
  Plus,
  Search,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    planSlug: 'starter',
    timezone: 'Africa/Addis_Ababa',
    currency: 'ETB',
  });

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const data = await platformApi.getBusinesses();
      setBusinesses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      await platformApi.createBusiness(formData);
      setModalOpen(false);
      setFormData({
        name: '',
        slug: '',
        email: '',
        phone: '',
        address: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        planSlug: 'starter',
        timezone: 'Africa/Addis_Ababa',
        currency: 'ETB',
      });
      await fetchBusinesses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create business');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to suspend "${name}"? Operations will be disabled.`)) return;
    try {
      await platformApi.suspendBusiness(id, 'Suspended by Super Admin');
      await fetchBusinesses();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await platformApi.activateBusiness(id);
      await fetchBusinesses();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to archive "${name}"? Historical data is preserved.`)) return;
    try {
      await platformApi.archiveBusiness(id);
      await fetchBusinesses();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const filtered = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()) ||
      b.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Barber Businesses</h1>
          <p className="text-sm text-slate-400">
            Manage all tenant shops, owner assignments, subscriptions, and operational statuses.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Business</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, slug, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Businesses Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden backdrop-blur-xl shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No businesses match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="px-6 py-4">Shop Details</th>
                  <th className="px-6 py-4">Subdomain</th>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filtered.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700">
                          {b.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-200 block">{b.name}</span>
                          <span className="text-xs text-slate-400">{b.email || 'No email set'}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 font-mono text-xs text-amber-400">
                        {b.slug}.bsms.com
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-xs text-slate-300 block">
                        {b.subscriptions?.[0]?.plan?.name || 'Starter Tier'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {b.currency || 'ETB'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : b.status === 'SUSPENDED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/platform/businesses/${b.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      {b.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleSuspend(b.id, b.name)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition"
                        >
                          Suspend
                        </button>
                      )}

                      {b.status === 'SUSPENDED' && (
                        <button
                          onClick={() => handleActivate(b.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
                        >
                          Activate
                        </button>
                      )}

                      {b.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleArchive(b.id, b.name)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition"
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Provision New Barber Business</h2>
                <p className="text-xs text-slate-400">Set up shop details and initial owner account</p>
              </div>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Fade Lounge"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-');
                      setFormData({ ...formData, name, slug: formData.slug || slug });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subdomain Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. royal-fade"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@royalfade.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+251 91 100 2233"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3">
                  Initial Shop Owner Credentials
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Owner Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dawit Bekele"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="dawit@royalfade.com"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Temporary Password (defaults to Owner123!)
                  </label>
                  <input
                    type="password"
                    placeholder="Owner123!"
                    value={formData.ownerPassword}
                    onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Confirm & Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
