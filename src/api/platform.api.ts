import { apiClient } from './client';
import type { PlatformOverview, Tenant, User, Plan, Subscription, AuditLog } from '../types';

export const platformApi = {
  getOverview: async (): Promise<PlatformOverview> => {
    return apiClient<PlatformOverview>('/platform/overview');
  },

  getBusinesses: async (): Promise<Tenant[]> => {
    return apiClient<Tenant[]>('/platform/businesses');
  },

  getBusinessById: async (id: string): Promise<Tenant> => {
    return apiClient<Tenant>(`/platform/businesses/${id}`);
  },

  createBusiness: async (data: {
    name: string;
    slug: string;
    email: string;
    phone?: string;
    address?: string;
    timezone?: string;
    currency?: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword?: string;
    planSlug?: string;
  }): Promise<{ tenant: Tenant; owner: User }> => {
    return apiClient<{ tenant: Tenant; owner: User }>('/platform/businesses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateBusiness: async (id: string, data: Partial<Tenant>): Promise<Tenant> => {
    return apiClient<Tenant>(`/platform/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  suspendBusiness: async (id: string, reason?: string): Promise<Tenant> => {
    return apiClient<Tenant>(`/platform/businesses/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  activateBusiness: async (id: string): Promise<Tenant> => {
    return apiClient<Tenant>(`/platform/businesses/${id}/activate`, {
      method: 'POST',
    });
  },

  archiveBusiness: async (id: string): Promise<Tenant> => {
    return apiClient<Tenant>(`/platform/businesses/${id}/archive`, {
      method: 'POST',
    });
  },

  getUsers: async (): Promise<User[]> => {
    return apiClient<User[]>('/platform/users');
  },

  getPlans: async (): Promise<Plan[]> => {
    return apiClient<Plan[]>('/platform/plans');
  },

  createPlan: async (data: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    interval?: 'MONTHLY' | 'YEARLY';
    maxBarbers?: number;
    maxMonthlyAppointments?: number;
    features?: string[];
  }): Promise<Plan> => {
    return apiClient<Plan>('/platform/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSubscriptions: async (): Promise<Subscription[]> => {
    return apiClient<Subscription[]>('/platform/subscriptions');
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return apiClient<AuditLog[]>('/platform/audit-logs');
  },
};
