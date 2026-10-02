import { apiClient } from './client';
import type { BusinessSchedule } from '../types';

export const scheduleApi = {
  getBusinessSchedule: () =>
    apiClient<BusinessSchedule[]>('/business-schedule'),

  updateBusinessSchedule: (items: Omit<BusinessSchedule, 'id'>[]) =>
    apiClient<BusinessSchedule[]>('/business-schedule', {
      method: 'PUT',
      body: JSON.stringify(items),
    }),
};
