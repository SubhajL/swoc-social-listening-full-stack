import { FeatureManagement, FEATURES } from './feature-management';
import { logger } from './logger';
import { AppError, createNetworkError, createValidationError, ErrorCode, ErrorSeverity } from '../types/api/errors';
import { z } from 'zod';

// API configuration
const MONITORING_API_URL = import.meta.env.VITE_MONITORING_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';
const MAIN_API_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';

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

// Clean endpoint by removing api prefix and ensuring proper format
const cleanEndpoint = (endpoint: string): string => {
  // Remove any leading/trailing slashes and 'api/' prefix
  const cleaned = endpoint.replace(/^\/?(api\/)?/, '').replace(/\/?$/, '');
  logger.debug('Cleaned endpoint', 'ApiClient', { 
    original: endpoint, 
    cleaned 
  });
  return cleaned;
};

// Construct full URL ensuring single /api path
const constructUrl = (baseUrl: string, endpoint: string): string => {
  const cleaned = cleanEndpoint(endpoint);
  const url = `${baseUrl}/api/${cleaned}`;
  logger.debug('Constructed URL', 'ApiClient', { 
    baseUrl, 
    endpoint: cleaned, 
    url 
  });
  return url;
};

// API Response schema
const ApiResponseSchema = z.object({
  data: z.unknown(),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string(),
  }).optional(),
});

type ApiResponse<T> = {
  data: T;
  metadata?: {
    timestamp: string;
    requestId: string;
  };
};

interface RequestConfig extends RequestInit {
  validateResponse?: (data: unknown) => boolean;
  timeout?: number;
}

// Map HTTP status codes to error codes
const getErrorCodeForStatus = (status: number): ErrorCode => {
  switch (status) {
    case 400:
      return ErrorCode.INVALID_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    default:
      return ErrorCode.UNKNOWN;
  }
};

// Map HTTP status codes to error severity
const getErrorSeverityForStatus = (status: number): ErrorSeverity => {
  if (status >= 500) {
    return ErrorSeverity.HIGH;
  }
  if (status >= 400) {
    return ErrorSeverity.MEDIUM;
  }
  return ErrorSeverity.LOW;
};

class EnhancedApiClient {
  private static instance: EnhancedApiClient;

  private constructor() {}

  static getInstance(): EnhancedApiClient {
    if (!EnhancedApiClient.instance) {
      EnhancedApiClient.instance = new EnhancedApiClient();
    }
    return EnhancedApiClient.instance;
  }

  private async handleResponse<T>(
    response: Response,
    validateResponse?: (data: unknown) => boolean
  ): Promise<ApiResponse<T>> {
    const data = await response.json();
    
    // Validate response structure
    const result = ApiResponseSchema.safeParse(data);
    if (!result.success) {
      throw createValidationError('ApiClient', {
        validationError: result.error,
        responseData: data,
      });
    }

    // Custom validation if provided
    if (validateResponse && !validateResponse(data.data)) {
      throw createValidationError('ApiClient', {
        message: 'Response data failed custom validation',
        responseData: data,
      });
    }

    return data;
  }

  private createAbortController(timeout?: number): AbortController {
    const controller = new AbortController();
    if (timeout) {
      setTimeout(() => controller.abort(), timeout);
    }
    return controller;
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = `req_${Math.random().toString(36).substring(2, 15)}`;
    const controller = this.createAbortController(config.timeout);
    
    try {
      logger.info('API request started', 'ApiClient', {
        endpoint,
        method: config.method || 'GET',
        requestId,
      });

      const baseUrl = getBaseUrl(endpoint);
      const url = constructUrl(baseUrl, endpoint);

      logger.debug('Making request to URL', 'ApiClient', { 
        url,
        baseUrl,
        endpoint,
        requestId
      });

      const response = await fetch(url, {
        ...config,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...config.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new AppError({
          code: getErrorCodeForStatus(response.status),
          message: response.statusText || 'Request failed',
          severity: getErrorSeverityForStatus(response.status),
          component: 'ApiClient',
          details: {
            status: response.status,
            url,
            endpoint,
            requestId,
          },
        });

        logger.error('Request failed', 'ApiClient', error, {
          status: response.status,
          url,
          endpoint,
          requestId,
        });

        throw error;
      }

      const result = await this.handleResponse<T>(response, config.validateResponse);

      logger.info('API request successful', 'ApiClient', {
        url,
        endpoint,
        requestId,
        responseSize: JSON.stringify(result).length,
      });

      return result;
    } catch (error) {
      const enhancedError = error instanceof AppError
        ? error
        : createNetworkError('ApiClient', {
            originalError: error,
            endpoint,
            requestId,
          });

      logger.error('API request failed', 'ApiClient', enhancedError, {
        endpoint,
        requestId,
      });

      throw enhancedError;
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, config: Omit<RequestConfig, 'method'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown, config: Omit<RequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown, config: Omit<RequestConfig, 'method' | 'body'> = {}) {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, config: Omit<RequestConfig, 'method'> = {}) {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = EnhancedApiClient.getInstance(); 