import { FeatureManagement, FEATURES } from './feature-management';
import { logger } from './logger';

// API configuration with feature-specific base URLs
const MAIN_API_URL = import.meta.env.VITE_MAIN_API_URL || 'http://localhost:8080/api';
const MONITORING_API_URL = import.meta.env.VITE_MONITORING_API_URL || 'http://localhost:3000/api';
const RID_API_URL = 'http://hyd-app.rid.go.th/API';

// OAuth library URLs
export const RID_OAUTH_URLS = {
  OAUTH_JS: `${RID_API_URL}/source/oauth.js`,
  SHA1_JS: `${RID_API_URL}/source/sha1.js`,
  OAUTH_PROXY: `${MONITORING_API_URL}/proxy/oauth.js`,
  SHA1_PROXY: `${MONITORING_API_URL}/proxy/sha1.js`
} as const;

// Helper to determine which base URL to use
const getBaseUrl = (endpoint: string): string => {
  // Monitoring-related endpoints use the monitoring API URL
  if (endpoint.includes('monitoring-stations') || 
      endpoint.includes('rain-stations') || 
      endpoint.includes('telemetry')) {
    logger.debug('Using monitoring API URL', 'ApiClient', { endpoint });
    return MONITORING_API_URL;
  }
  
  // All other endpoints use the main API URL
  logger.debug('Using main API URL', 'ApiClient', { endpoint });
  return MAIN_API_URL;
};

export const API_ENDPOINTS = {
  MONITORING_STATIONS: `monitoring-stations`,
  RAIN_STATIONS: `rain-stations`,
  RESERVOIRS: `reservoirs`,
  POSTS: `posts`,
} as const;

// Helper function to build URL with query parameters
export const buildUrl = (endpoint: string, params: Record<string, string | undefined>) => {
  const baseUrl = getBaseUrl(endpoint);
  const url = new URL(`${baseUrl}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  
  logger.debug('Built URL', 'ApiClient', { 
    endpoint, 
    baseUrl, 
    fullUrl: url.toString() 
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