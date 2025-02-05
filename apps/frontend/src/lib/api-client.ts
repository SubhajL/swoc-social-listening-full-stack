import { ProcessedPost } from '@/types/processed-post';
import { APIService } from '../services/core';

const apiService = APIService.getInstance();

interface ApiResponse<T> {
  data: T;
  message?: string;
}

export const apiClient = {
  getUnprocessedPosts: async (): Promise<ProcessedPost> => {
    const response = await apiService.get<ApiResponse<ProcessedPost>>('/posts/unprocessed');
    return response.data;
  },

  getPostById: async (id: string): Promise<ProcessedPost> => {
    const response = await apiService.get<ApiResponse<ProcessedPost>>(`/posts/${id}`);
    return response.data;
  }
}; 