// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
  MONITORING_STATIONS: `${API_BASE_URL}/monitoring-stations`,
  POSTS: `${API_BASE_URL}/posts`,
} as const;

// Helper function to build URL with query parameters
export const buildUrl = (endpoint: string, params: Record<string, string | undefined>) => {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  return url.toString();
};

// API error type
export interface ApiError extends Error {
  status?: number;
  statusText?: string;
}

// Create API error with additional context
export const createApiError = (message: string, response?: Response): ApiError => {
  const error = new Error(message) as ApiError;
  if (response) {
    error.status = response.status;
    error.statusText = response.statusText;
  }
  return error;
}; 