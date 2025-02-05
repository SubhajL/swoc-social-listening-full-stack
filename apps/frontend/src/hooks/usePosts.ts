import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { socketClient } from '@/lib/socket-client';
import type { ProcessedPost } from '@/types/processed-post';
import type { CategoryName } from '@/types/processed-post';

interface UsePostsOptions {
  selectedCategories?: CategoryName[];
  selectedProvince?: string;
  selectedAmphure?: string;
  selectedTumbon?: string;
}

interface UsePostsState {
  posts: ProcessedPost[];
  filteredPosts: ProcessedPost[];
  isLoading: boolean;
  error: string | null;
}

export function usePosts(options: UsePostsOptions = {}) {
  const {
    selectedCategories = [],
    selectedProvince,
    selectedAmphure,
    selectedTumbon
  } = options;

  const [state, setState] = useState<UsePostsState>({
    posts: [],
    filteredPosts: [],
    isLoading: true,
    error: null
  });

  // Filter posts based on selected criteria
  const filterPosts = useCallback((posts: ProcessedPost[]) => {
    return posts.filter(post => {
      // Filter by category
      if (selectedCategories.length > 0 && !selectedCategories.includes(post.category_name as CategoryName)) {
        return false;
      }

      // Filter by location
      if (selectedProvince && !post.province.includes(selectedProvince)) {
        return false;
      }

      if (selectedAmphure && !post.amphure.includes(selectedAmphure)) {
        return false;
      }

      if (selectedTumbon && !post.tumbon.includes(selectedTumbon)) {
        return false;
      }

      return true;
    });
  }, [selectedCategories, selectedProvince, selectedAmphure, selectedTumbon]);

  // Update filtered posts when filters or posts change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filteredPosts: filterPosts(prev.posts)
    }));
  }, [filterPosts, state.posts]);

  // Fetch initial posts and setup WebSocket
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const data = await apiClient.getUnprocessedPosts();
        const posts = Array.isArray(data) ? data : [data];
        setState(prev => ({
          ...prev,
          posts,
          filteredPosts: filterPosts(posts),
          isLoading: false
        }));
      } catch (err) {
        console.error('Error fetching posts:', err);
        setState(prev => ({
          ...prev,
          error: 'Failed to fetch posts. Please try again later.',
          isLoading: false
        }));
      }
    };

    fetchPosts();

    // Connect to WebSocket
    socketClient.connect();

    // Subscribe to post updates
    const unsubscribe = socketClient.onPostUpdate((updatedPost) => {
      setState(prev => {
        const postIndex = prev.posts.findIndex(p => p.processed_post_id === updatedPost.processed_post_id);
        let newPosts: ProcessedPost[];

        if (postIndex === -1) {
          newPosts = [...prev.posts, updatedPost];
        } else {
          newPosts = [...prev.posts];
          newPosts[postIndex] = updatedPost;
        }

        return {
          ...prev,
          posts: newPosts,
          filteredPosts: filterPosts(newPosts)
        };
      });
    });

    return () => {
      unsubscribe();
      socketClient.disconnect();
    };
  }, [filterPosts]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await apiClient.getUnprocessedPosts();
      const posts = Array.isArray(data) ? data : [data];
      setState(prev => ({
        ...prev,
        posts,
        filteredPosts: filterPosts(posts),
        isLoading: false
      }));
    } catch (err) {
      console.error('Error refreshing posts:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to refresh posts. Please try again later.',
        isLoading: false
      }));
    }
  }, [filterPosts]);

  return {
    ...state,
    refresh
  };
} 