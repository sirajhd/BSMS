import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const PlatformLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', to: '/platform/dashboard', icon: LayoutDashboard },
    { label: 'Businesses', to: '/platform/businesses', icon: Building2 },
    { label: 'Platform Users', to: '/platform/users', icon: Users },
    { label: 'Plans & Subscriptions', to: '/platform/plans', icon: CreditCard },
    { label: 'Audit Trail', to: '/platform/audit-logs', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-slate-950">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-amber-500">BSMS PLATFORM</span>
            <span className="text-xs block text-slate-400">Super Admin</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/80 p-4 shrink-0 transition-all z-20`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex items-center space-x-3 px-2 py-4 mb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              BSMS SAAS
            </h1>
            <span className="text-xs text-amber-500/80 font-mono tracking-wider font-semibold">
              SUPER ADMIN CONSOLE
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Badge & Signout */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 truncate max-w-[150px]">
                {user?.email}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PLATFORM
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
          >
            <span>Switch to Demo Shop</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
