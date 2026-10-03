import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Calendar, Clock, ShieldCheck, ArrowRight, Star, Building2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useTenant } from '../../contexts/TenantContext';

export const LandingPage: React.FC = () => {
  const { tenant } = useTenant();

  const brandName = tenant?.name || 'Crown & Blade';
  const currency = tenant?.currency || 'ETB';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-500 border border-amber-600/30 flex items-center justify-center">
              {tenant?.logo ? (
                <img src={tenant.logo} alt={brandName} className="w-6 h-6 rounded object-contain" />
              ) : (
                <Scissors className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-tight">{brandName}</span>
              {tenant && <span className="text-[10px] text-amber-500 font-mono">@{tenant.slug}</span>}
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">
                Book Now
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-600/30 bg-amber-600/10 text-amber-400 text-xs font-medium mb-6">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Master Craftsmanship & Online Booking</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            Effortless Grooming Appointments,{' '}
            <span className="text-amber-500">Zero Waiting.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Reserve your seat at <strong className="text-neutral-200">{brandName}</strong> with professional master barbers, pick your exact time window, and enjoy seamless grooming without crowded shop lines.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/customer/book" className="w-full sm:w-auto">
              <Button size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Book Your Appointment
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full">
                Member Portal
              </Button>
            </Link>
          </div>
        </section>

        {/* Value Proposition Grid */}
        <section className="py-16 border-t border-neutral-800/80 bg-neutral-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Live Availability</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Select your preferred barber and choose an open slot guaranteed by real-time conflict protection.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Punctual Service</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Dedicated duration tracking ensures each cut, trim, or wash starts and finishes reliably on schedule.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800">
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-100 mb-2">Transparent Pricing</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                All services are clearly priced in {currency} with options to pay online or directly at the shop counter.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto px-4 w-full gap-2">
        <p>&copy; 2026 {brandName}. All rights reserved.</p>
        <div className="flex items-center gap-2 text-neutral-600">
          <Building2 className="w-3.5 h-3.5" />
          <span>Powered by BSMS Multi-Tenant SaaS Platform</span>
        </div>
      </footer>
    </div>
  );
};