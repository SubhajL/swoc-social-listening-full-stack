import { ProcessedPost } from '@/types/processed-post';

interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export const apiClient = {
  async getUnprocessedPosts(): Promise<ProcessedPost[]> {
    const response = await fetch('/api/posts/unprocessed');
    const { data } = (await response.json()) as ApiResponse<ProcessedPost[]>;
    return data;
  },

  async getPostById(id: string): Promise<ProcessedPost> {
    const response = await fetch(`/api/posts/${id}`);
    const { data } = (await response.json()) as ApiResponse<ProcessedPost>;
    return data;
  }
}; 