import { apiClient } from './client';
import type { Barber, BarberAvailability } from '../types';

export const barbersApi = {
  getBarbers: (includeInactive = false) =>
    apiClient<Barber[]>('/barbers', {
      params: { includeInactive },
    }),

  getBarberById: (id: string) =>
    apiClient<Barber>(`/barbers/${id}`),

  createBarber: (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
  }) =>
    apiClient<Barber>('/barbers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBarber: (id: string, data: Partial<Barber>) =>
    apiClient<Barber>(`/barbers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  toggleBarberStatus: (id: string) =>
    apiClient<Barber>(`/barbers/${id}/toggle-status`, {
      method: 'PATCH',
    }),

  getBarberAvailability: (barberId: string) =>
    apiClient<BarberAvailability[]>(`/barbers/${barberId}/availability`),

  updateBarberAvailability: (
    barberId: string,
    windows: Omit<BarberAvailability, 'id' | 'barberId'>[]
  ) =>
    apiClient<BarberAvailability[]>(`/barbers/${barberId}/availability`, {
      method: 'PUT',
      body: JSON.stringify(windows),
    }),
};
