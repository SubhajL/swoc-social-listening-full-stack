import axios from 'axios';
import type { ProcessedPostDTO } from '@/types/processed-post';

// Add debug logging
console.log('Environment variables:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  DEV: import.meta.env.DEV,
  MODE: import.meta.env.MODE
});

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const postsApi = {
  getUnprocessed: async () => {
    const response = await apiClient.get<{ data: ProcessedPostDTO[] }>('/posts/unprocessed');
    return response.data.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<{ data: ProcessedPostDTO }>(`/posts/${id}`);
    return response.data.data;
  },

  getByLocation: async (latitude: number, longitude: number, radius?: number) => {
    const response = await apiClient.get<{ data: ProcessedPostDTO[] }>('/posts/location', {
      params: { latitude, longitude, radius }
    });
    return response.data.data;
  },

  updatePost: async (id: string, updates: {
    status?: string;
    location?: {
      tumbon?: string;
      amphure?: string;
      province?: string;
    };
    nearest_sensor_id?: string;
  }) => {
    const response = await apiClient.patch<{ data: ProcessedPostDTO }>(`/posts/${id}`, updates);
    return response.data.data;
  }
}; 