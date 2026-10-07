import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import {
  Scissors,
  LayoutDashboard,
  Users,
  Sparkles,
  CalendarCheck,
  Clock,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  ExternalLink,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { profile, logout, isSuperAdmin } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true, state: {} });
  };

  const adminName =
    profile && 'fullName' in profile && profile.fullName
      ? profile.fullName
      : 'Shop Manager';

  const shopName = tenant?.name || 'Crown & Blade';

  const navItems = [
    { label: 'Executive KPIs', path: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Barber Roster', path: '/admin/barbers', icon: <Users className="w-4 h-4" /> },
    { label: 'Services & Pricing', path: '/admin/services', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'All Appointments', path: '/admin/appointments', icon: <CalendarCheck className="w-4 h-4" /> },
    { label: 'Business Hours', path: '/admin/schedule', icon: <Clock className="w-4 h-4" /> },
    { label: 'Financial Reports', path: '/admin/reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: 'Shop Settings', path: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-neutral-800 bg-neutral-900/90 shrink-0">
        <div className="p-5 border-b border-neutral-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-600/30 flex items-center justify-center shrink-0 overflow-hidden">
            {tenant?.logo ? (
              <img src={tenant.logo} alt={shopName} className="w-full h-full object-cover" />
            ) : (
              <Scissors className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-sm tracking-tight block truncate text-neutral-100">
              {shopName}
            </span>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block -mt-0.5">
              Workspace Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-600 text-neutral-950 shadow-md font-bold'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {isSuperAdmin && (
          <div className="p-3 border-t border-neutral-800/60">
            <Link
              to="/platform/dashboard"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition"
            >
              <span>Platform Super Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-neutral-200 block truncate">{adminName}</span>
              <span className="text-[10px] text-neutral-500 block truncate">Owner / Manager</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden border-b border-neutral-800 bg-neutral-900/90 px-4 h-16 flex items-center justify-between sticky top-0 z-30">
        <Link to="/admin/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-500 border border-amber-600/30 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm truncate">{shopName}</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-lg text-neutral-400 hover:text-white"
          aria-label="Toggle admin menu"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="md:hidden border-b border-neutral-800 bg-neutral-900 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                  isActive
                    ? 'bg-amber-600 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          {isSuperAdmin && (
            <Link
              to="/platform/dashboard"
              onClick={() => setMobileSidebarOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20"
            >
              <span>Platform Super Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <div className="pt-2 border-t border-neutral-800 flex justify-end">
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-red-400 flex items-center gap-1.5 py-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Administrative Viewport */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
