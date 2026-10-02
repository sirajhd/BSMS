import { apiClient } from './client';
import type { Service } from '../types';

export const servicesApi = {
  getServices: (includeInactive = false) =>
    apiClient<Service[]>('/services', {
      params: { includeInactive },
    }),

  getServiceById: (id: string) =>
    apiClient<Service>(`/services/${id}`),

  createService: (data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiClient<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateService: (id: string, data: Partial<Service>) =>
    apiClient<Service>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  toggleServiceStatus: (id: string) =>
    apiClient<Service>(`/services/${id}/toggle-status`, {
      method: 'PATCH',
    }),
};
