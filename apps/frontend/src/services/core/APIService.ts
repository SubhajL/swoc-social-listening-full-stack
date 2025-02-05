import { ConnectionManager } from './ConnectionManager';

export interface APIResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
  retries?: number;
}

export interface APIConfig {
  baseUrl?: string;
  debug?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export class APIService {
  private static instance: APIService;
  private connectionManager: ConnectionManager;

  private constructor() {
    this.connectionManager = ConnectionManager.getInstance();
  }

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  private getFullUrl(endpoint: string): string {
    const baseUrl = this.connectionManager.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  private async handleResponse<T>(response: Response): Promise<APIResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let error: Error;
      if (isJson) {
        const errorData = await response.json();
        error = new Error(errorData.error?.message || 'Request failed');
        Object.assign(error, errorData);
      } else {
        error = new Error(response.statusText || 'Request failed');
      }
      throw error;
    }

    if (isJson) {
      return await response.json();
    }

    return { data: await response.text() as unknown as T };
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { retries = 3, ...fetchConfig } = config;

    // Ensure connection before making request
    if (!await this.connectionManager.ensureConnection()) {
      throw new Error('Unable to establish connection to server');
    }

    const url = this.getFullUrl(endpoint);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchConfig,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...fetchConfig.headers,
          },
        });

        const result = await this.handleResponse<T>(response);
        return result.data;
      } catch (error) {
        lastError = error as Error;
        console.error(`Request failed (attempt ${attempt + 1}/${retries + 1}):`, error);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  async get<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data: unknown, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
} 