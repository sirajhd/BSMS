import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import {
  Scissors,
  CalendarCheck,
  UserPlus,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  Clock,
} from 'lucide-react';

export const BarberLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true, state: {} });
  };

  const barberName =
    profile && 'fullName' in profile && profile.fullName
      ? profile.fullName
      : 'Master Barber';

  const shopName = tenant?.name || 'Crown & Blade';

  const navItems = [
    { label: "Today's Queue", path: '/barber/dashboard', icon: <CalendarCheck className="w-4 h-4" /> },
    { label: 'Walk-In Booking', path: '/barber/walk-in', icon: <UserPlus className="w-4 h-4" /> },
    { label: 'My Schedule', path: '/barber/appointments', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/barber/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-600/30 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base tracking-tight block truncate">{shopName}</span>
              <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider block -mt-1">
                Barber Workstation
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/barber/notifications"
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              aria-label="Barber notifications"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-neutral-800">
              <Link
                to="/barber/profile"
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-neutral-200">{barberName}</span>
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

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-neutral-900 px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
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
                to="/barber/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs text-neutral-300"
              >
                <User className="w-4 h-4 text-amber-500" />
                <span>{barberName}</span>
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-800/80 py-4 text-center text-xs text-neutral-500">
        <p>&copy; 2026 {shopName} — Station Interface</p>
      </footer>
    </div>
  );
};