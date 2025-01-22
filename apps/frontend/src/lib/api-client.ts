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
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch posts');
    }
    const { data } = (await response.json()) as ApiResponse<ProcessedPost[]>;
    return data || [];
  },

  async getPostById(id: string): Promise<ProcessedPost> {
    const response = await fetch(`/api/posts/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch post');
    }
    const { data } = (await response.json()) as ApiResponse<ProcessedPost>;
    return data;
  }
}; 