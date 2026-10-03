import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

export interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isLoading, hasRole, isSuperAdmin } = useAuth();

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

  // Super Admins have universal clearance
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!hasRole(...allowedRoles)) {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return <Navigate to="/platform/dashboard" replace />;
      case 'SHOP_OWNER':
      case 'MANAGER':
      case 'ADMIN':
        return <Navigate to="/admin/dashboard" replace />;
      case 'BARBER':
        return <Navigate to="/barber/dashboard" replace />;
      case 'CUSTOMER':
        return <Navigate to="/customer/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};