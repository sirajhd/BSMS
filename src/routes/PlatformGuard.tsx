import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PlatformGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    switch (user.role) {
      case 'BARBER':
        return <Navigate to="/barber/dashboard" replace />;
      case 'CUSTOMER':
        return <Navigate to="/customer/dashboard" replace />;
      case 'SHOP_OWNER':
      case 'MANAGER':
      case 'ADMIN':
      default:
        return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
