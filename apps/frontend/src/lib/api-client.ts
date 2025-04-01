import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { ProcessedPost } from '@/types/processed-post';
import { toast } from '@/components/ui/use-toast';
import { API_BASE_URL, API_TIMEOUT } from './config';

/**
 * API Client Configuration Notes
 * 
 * API Path Structure:
 * - All backend API routes are registered with the '/api' prefix
 * - The Vite development server proxies '/api' requests to the backend
 * - In production, the API_BASE_URL is used directly
 * 
 * Therefore, all API endpoints should include the '/api' prefix:
 * CORRECT: '/api/posts/unprocessed'
 * INCORRECT: '/posts/unprocessed'
 */

// Create a throttled logger to prevent excessive console logging
const createThrottledLogger = (name: string, interval: number = 5000) => {
  let lastLogTime = 0;
  
  return (message: string, data?: any) => {
    const now = Date.now();
    if (now - lastLogTime > interval) {
      console.log(`${name}: ${message}`, data);
      lastLogTime = now;
    }
  };
};

const apiLogger = createThrottledLogger('🔌 API');

// Configuration for retries
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// Add request interceptor for auth token and logging
axiosInstance.interceptors.request.use(
  (config) => {
    // Improved token retrieval logic with fallbacks
    let token = null;
    let tokenSource = 'none';
    
    // Try auth store first (via localStorage)
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        if (authData?.state?.token) {
          token = authData.state.token;
          tokenSource = 'auth-storage';
        }
      }
    } catch (error) {
      console.error('❌ [API] Error parsing auth-storage:', error);
    }
    
    // Fallback to direct localStorage token if auth store token not found
    if (!token) {
      const localToken = localStorage.getItem('token');
      if (localToken) {
        token = localToken;
        tokenSource = 'localStorage';
      }
    }
    
    // Enhanced token debugging
    console.log('🔍 [API] Token check for request:', {
      url: `${config.baseURL}${config.url}`,
      hasTokenInLocalStorage: !!localStorage.getItem('token'),
      hasTokenInAuthStorage: !!JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token,
      finalTokenUsed: !!token,
      tokenSource,
    });
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 [API] Adding auth token to request from source:', tokenSource);
      
      // Check token format and expiry
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const expiry = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          const isExpired = now > expiry;
          
          console.log('🔍 [API] Token status check:', {
            isExpired,
            timeRemaining: isExpired ? 'Expired' : Math.floor((expiry - now) / 1000 / 60) + ' minutes',
            tokenSubject: payload.sub,
            tokenSource,
          });
          
          if (isExpired) {
            console.warn('⚠️ [API] Using expired token for request, authentication will likely fail');
            
            // Clear expired tokens
            if (tokenSource === 'localStorage') {
              console.log('🧹 [API] Clearing expired token from localStorage');
              localStorage.removeItem('token');
            }
            
            // Don't clear auth-storage here as it's managed by the store
          }
        } else {
          console.warn('⚠️ [API] Token format is invalid, authentication will likely fail');
        }
      } catch (error) {
        console.error('❌ [API] Error checking token format/expiry:', error);
      }
    } else {
      console.warn('⚠️ [API] No auth token found for request to:', `${config.baseURL}${config.url}`);
    }
    
    // Log request details for debugging
    console.log(`🔍 [API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      params: config.params,
      data: config.data,
      headers: {
        ...config.headers,
        Authorization: config.headers.Authorization && typeof config.headers.Authorization === 'string' ? 
          `Bearer ${config.headers.Authorization.substring(7, 17)}...` : 
          config.headers.Authorization
      }
    });
    
    apiLogger(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
    
    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and logging
axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ [API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  (error: AxiosError) => {
    // Enhanced error logging
    console.error(`❌ [API Error] Request failed:`, {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
    });
    
    // Check if error is due to authentication
    if (error.response?.status === 401) {
      console.error('❌ [API] Authentication error - token may be invalid or expired');
      
      // Check token in localStorage
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expiry = payload.exp * 1000;
            const now = Date.now();
            
            console.log('🔍 [API] Token details for failed request:', {
              isExpired: now > expiry,
              expiryTime: new Date(expiry).toISOString(),
              currentTime: new Date(now).toISOString(),
              subject: payload.sub,
            });
          }
        } catch (error) {
          console.error('❌ [API] Error parsing token for failed request:', error);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get a user-friendly error message
const getErrorMessage = (error: AxiosError): string => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status;
    const data = error.response.data as any;
    
    if (status === 404) {
      return 'ไม่พบข้อมูลที่ต้องการ';
    } else if (status === 401) {
      return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ กรุณาเข้าสู่ระบบใหม่';
    } else if (status === 403) {
      return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
    } else if (status === 400) {
      return data.message || 'ข้อมูลที่ส่งไม่ถูกต้อง';
    } else if (status >= 500) {
      return 'เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ภายหลัง';
    }
    
    return data.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  } else if (error.request) {
    // The request was made but no response was received
    return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  } else {
    // Something happened in setting up the request that triggered an Error
    return 'เกิดข้อผิดพลาดในการส่งคำขอ';
  }
};

interface ApiResponse<T> {
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// API client functions
export const apiClient = {
  // Server connectivity check
  ping: async (): Promise<boolean> => {
    try {
      apiLogger('Attempting to ping server');
      // Make a simple HEAD request to the API health endpoint
      const response = await axiosInstance.head('/api/health', { 
        timeout: 5000 // Short timeout for quick response
      });
      apiLogger(`Server ping successful: ${response.status}`);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Server ping failed:', error);
      return false;
    }
  },

  // Posts
  getPosts: async (params?: any) => {
    try {
      apiLogger(`Fetching posts with params:`, params);
      
      const response = await axiosInstance.get('/api/posts/processed', { params });
      
      // Log the response details
      const postsCount = Array.isArray(response.data) ? response.data.length : 
                         (response.data.data && Array.isArray(response.data.data)) ? response.data.data.length : 0;
      
      apiLogger(`Received ${postsCount} posts from API`, {
        responseStatus: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasData: response.data && typeof response.data === 'object' && 'data' in response.data,
        sample: postsCount > 0 ? (Array.isArray(response.data) ? response.data[0] : 
                (response.data.data && Array.isArray(response.data.data)) ? response.data.data[0] : null) : null
      });
      
      // If no posts were returned, log a warning
      if (postsCount === 0) {
        console.warn('API returned 0 posts. This could be due to:');
        console.warn('1. No posts exist in the database');
        console.warn('2. The date range filter is too restrictive');
        console.warn('3. The category filter is not matching any posts');
        console.warn('4. There might be an issue with the API endpoint');
        console.warn('Params used:', params);
      }
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data;
      } else {
        console.warn('Unexpected API response format for posts:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Get posts error:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  getUnprocessedPosts: async (params?: any) => {
    try {
      apiLogger(`Fetching unprocessed posts with params:`, params);
      
      // Use the correct API path with the /api prefix
      const response = await axiosInstance.get('/api/posts/unprocessed', { params });
      
      // Log the response details
      const postsCount = Array.isArray(response.data) ? response.data.length : 
                       (response.data.data && Array.isArray(response.data.data)) ? response.data.data.length : 0;
      
      apiLogger(`Received ${postsCount} unprocessed posts from API`, {
        responseStatus: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        hasData: response.data && typeof response.data === 'object' && 'data' in response.data,
        sample: postsCount > 0 ? (Array.isArray(response.data) ? response.data[0] : 
              (response.data.data && Array.isArray(response.data.data)) ? response.data.data[0] : null) : null
      });
      
      // If no posts were returned, log a warning
      if (postsCount === 0) {
        console.warn('API returned 0 unprocessed posts. This could be due to:');
        console.warn('1. No unprocessed posts exist in the database');
        console.warn('2. The date range filter is too restrictive');
        console.warn('3. There might be an issue with the API endpoint');
        console.warn('Params used:', params);
      }
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return response.data.data;
      } else {
        console.warn('Unexpected API response format for unprocessed posts:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Get unprocessed posts error:', error);
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  getPostById: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/api/posts/processed/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get post by ID error:', error);
      throw error;
    }
  },

  // Auth
  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/api/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // User management
  changePassword: async (userId: number, newPassword: string) => {
    try {
      const response = await axiosInstance.post('/api/auth/change-password', { 
        userId, 
        newPassword 
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // Add more API functions as needed
};

export const checkApiHealth = async (): Promise<boolean> => {
  try {
    console.log('🔍 [API] Checking API health');
    
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('🔍 [API Health Check] Response:', {
      status: response.status,
      ok: response.ok,
      timestamp: new Date().toISOString()
    });

    return response.ok;
  } catch (error) {
    console.error('❌ [API Health Check] Error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    return false;
  }
};

export default axiosInstance; 