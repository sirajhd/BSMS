import { apiClient } from './client';

export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
}

export const uploadApi = {
  uploadImage: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    return apiClient<UploadResponse>('/uploads', {
      method: 'POST',
      body: formData,
    });
  },
};
