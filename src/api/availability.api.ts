import { apiClient } from './client';

export interface AvailabilityResponse {
  slots: string[];
  metadata: {
    isOpen: boolean;
    durationMinutes: number;
  };
}

export const availabilityApi = {
  getAvailableSlots: (serviceId: string, barberId: string, date: string) =>
    apiClient<AvailabilityResponse>('/availability', {
      params: { serviceId, barberId, date },
    }),
};
