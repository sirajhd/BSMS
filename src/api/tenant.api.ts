import { apiClient } from './client';
import type { Tenant, TenantSettings, AuditLog } from '../types';

export const tenantApi = {
  getCurrentTenant: async (): Promise<Tenant> => {
    return apiClient<Tenant>('/tenant/current');
  },

  updateSettings: async (settings: Partial<TenantSettings> & { name?: string; phone?: string; email?: string; address?: string; logo?: string }): Promise<TenantSettings> => {
    return apiClient<TenantSettings>('/tenant/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return apiClient<AuditLog[]>('/tenant/audit-logs');
  },
};
