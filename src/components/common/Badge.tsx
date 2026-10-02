import React from 'react';
import type { AppointmentStatus, PaymentStatus } from '../../types';

export interface BadgeProps {
  status: AppointmentStatus | PaymentStatus;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const formatStatus = (val: string) => {
    return val.replace(/_/g, ' ');
  };

  const getStyle = () => {
    switch (status) {
      case 'CONFIRMED':
      case 'PAID':
      case 'COMPLETED':
        return 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60';
      case 'IN_PROGRESS':
      case 'CHECKED_IN':
        return 'bg-blue-950/80 text-blue-300 border border-blue-800/60';
      case 'PENDING':
      case 'RESCHEDULED':
        return 'bg-amber-950/80 text-amber-300 border border-amber-800/60';
      case 'CANCELLED':
      case 'FAILED':
      case 'NO_SHOW':
        return 'bg-red-950/80 text-red-300 border border-red-800/60';
      case 'LATE':
        return 'bg-orange-950/80 text-orange-300 border border-orange-800/60';
      case 'REFUNDED':
        return 'bg-purple-950/80 text-purple-300 border border-purple-800/60';
      default:
        return 'bg-neutral-800 text-neutral-300 border border-neutral-700';
    }
  };

  return (
    <span className={`inline-flex items-center rounded-full uppercase tracking-wider ${sizeClasses} ${getStyle()}`}>
      {formatStatus(status)}
    </span>
  );
};