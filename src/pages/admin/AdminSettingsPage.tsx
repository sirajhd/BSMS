import React, { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { tenantApi } from '../../api/tenant.api';
import { Save, CheckCircle2 } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { tenant, settings, refreshTenant } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    primaryColor: '#d97706',
    secondaryColor: '#0f172a',
    bookingNoticeHours: 1,
    maxAdvanceBookingDays: 30,
    cancellationCutoffHours: 2,
    allowWalkIns: true,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        address: tenant.address || '',
        primaryColor: settings?.primaryColor || '#d97706',
        secondaryColor: settings?.secondaryColor || '#0f172a',
        bookingNoticeHours: settings?.bookingNoticeHours ?? 1,
        maxAdvanceBookingDays: settings?.maxAdvanceBookingDays ?? 30,
        cancellationCutoffHours: settings?.cancellationCutoffHours ?? 2,
        allowWalkIns: settings?.allowWalkIns ?? true,
      });
    }
  }, [tenant, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await tenantApi.updateSettings(formData);
      await refreshTenant();
      setSuccessMessage('Business settings and branding updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-100">Shop Settings &amp; Branding</h1>
        <p className="text-sm text-neutral-400">
          Customize your shop name, contact information, booking cancellation policies, and brand theme.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center space-x-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Identity */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
            Shop Profile &amp; Contact
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Shop Display Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Physical Location / Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Booking Rules & Policies */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
            Booking &amp; Scheduling Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Minimum Notice (Hours)
              </label>
              <input
                type="number"
                min={0}
                value={formData.bookingNoticeHours}
                onChange={(e) => setFormData({ ...formData, bookingNoticeHours: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Max Advance Booking (Days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={formData.maxAdvanceBookingDays}
                onChange={(e) => setFormData({ ...formData, maxAdvanceBookingDays: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Cancellation Cutoff (Hours)
              </label>
              <input
                type="number"
                min={0}
                value={formData.cancellationCutoffHours}
                onChange={(e) => setFormData({ ...formData, cancellationCutoffHours: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="allowWalkIns"
              checked={formData.allowWalkIns}
              onChange={(e) => setFormData({ ...formData, allowWalkIns: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-neutral-700 bg-neutral-950"
            />
            <label htmlFor="allowWalkIns" className="text-sm text-neutral-300 font-medium">
              Enable Walk-In Registration on staff terminals
            </label>
          </div>
        </div>

        {/* Brand Theme */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
            Brand Identity Colors
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Primary Brand Accent Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-32 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-200"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
