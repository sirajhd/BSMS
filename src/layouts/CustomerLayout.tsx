import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import {
  Scissors,
  Calendar,
  Clock,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export const CustomerLayout: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount] = useState<number>(0);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const shopName = tenant?.name || 'Crown & Blade';

  const navItems = [
    { label: 'Dashboard', path: '/customer/dashboard', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'Book Cut', path: '/customer/book', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Services', path: '/customer/services', icon: <Scissors className="w-4 h-4" /> },
    { label: 'My Appointments', path: '/customer/appointments', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/customer/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-600/30 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base tracking-tight block truncate">{shopName}</span>
              <span className="text-[10px] text-amber-500 font-medium uppercase tracking-wider block -mt-1">
                Customer Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-600/15 text-amber-400 border border-amber-600/30'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons: Notification Bell & Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <Link
              to="/customer/notifications"
              className="relative p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-neutral-900" />
              )}
            </Link>

            {/* Profile Summary & Logout */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-neutral-800">
              <Link
                to="/customer/profile"
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-neutral-200 max-w-[120px] truncate">
                  {'fullName' in (profile || {})
                    ? (profile as { fullName?: string }).fullName
                    : user?.email?.split('@')[0]}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-neutral-900 px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-amber-600/15 text-amber-400 border border-amber-600/30'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="pt-3 mt-2 border-t border-neutral-800 flex items-center justify-between">
              <Link
                to="/customer/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs text-neutral-300"
              >
                <User className="w-4 h-4 text-amber-500" />
                <span>My Profile</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Outlet Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 py-4 text-center text-xs text-neutral-500">
        <p>&copy; 2026 {shopName}. All rights reserved.</p>
      </footer>
    </div>
  );
};