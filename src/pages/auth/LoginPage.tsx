import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Eye, EyeOff, Lock, Mail, Scissors, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const { tenant } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both your email and password.');
      return;
    }

    setIsLoading(true);
    const result = await login(email.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    // Role-aware redirection
    if (from) {
      navigate(from, { replace: true });
    } else {
      if (email.includes('superadmin') || user?.role === 'SUPER_ADMIN' || user?.platformRole === 'SUPER_ADMIN') {
        navigate('/platform/dashboard', { replace: true });
      } else if (email.includes('admin') || email.includes('owner') || email.includes('manager') || user?.role === 'SHOP_OWNER' || user?.role === 'MANAGER' || user?.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (email.includes('barber') || user?.role === 'BARBER') {
        navigate('/barber/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    }
  };

  // Helper for quick testing during development & demo reviews
  const handleQuickLogin = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
  };

  const brandName = tenant?.name || 'Crown & Blade';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-600/10 text-amber-500 mb-3 border border-amber-600/20">
            {tenant?.logo ? (
              <img src={tenant.logo} alt={brandName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <Scissors className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{brandName}</h1>
          <p className="text-sm text-neutral-400 mt-1">Multi-Tenant SaaS Portal Authentication</p>
        </div>

        <Card className="border-neutral-800 shadow-xl">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800/80 flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-neutral-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-neutral-400">Remember credentials</span>
              <button
                type="button"
                onClick={() => alert('Password reset is managed through administrator support.')}
                className="text-amber-500 hover:text-amber-400 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          {/* Quick Login Helper for Development & SaaS Platform Demonstration */}
          <div className="mt-6 pt-5 border-t border-neutral-800/80">
            <p className="text-xs text-neutral-400 font-medium mb-2.5 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              Demo Roles Quick Sign-In:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin@bsms.com', 'SuperAdmin123!')}
                className="text-xs py-1.5 px-2 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-amber-300 font-mono transition-colors text-left"
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@crownandblade.com', 'Owner123!')}
                className="text-xs py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors text-left"
              >
                🏬 Shop Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('barber@barbershop.com', 'Barber123!')}
                className="text-xs py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors text-left"
              >
                ✂️ Barber
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('customer@barbershop.com', 'Customer123!')}
                className="text-xs py-1.5 px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono transition-colors text-left"
              >
                👤 Customer
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-amber-500 hover:text-amber-400 font-semibold underline underline-offset-4">
            Register as Customer
          </Link>
        </p>
      </div>
    </div>
  );
};