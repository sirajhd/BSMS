import { apiClient } from './client';
import type { User, CustomerProfile, Barber } from '../types';

export interface AuthSessionResponse {
  user: User;
  profile: CustomerProfile | Barber | null;
  token: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    profileImage?: string;
  }) =>
    apiClient<AuthSessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiClient<null>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    apiClient<{ user: User; profile: CustomerProfile | Barber | null }>('/auth/me'),

  updateProfile: (data: {
    fullName?: string;
    phone?: string;
    profileImage?: string;
  }) =>
    apiClient<CustomerProfile | Barber>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
