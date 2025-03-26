// HTTP client with enhanced logging
import axios from 'axios';

/**
 * Creates an axios instance with enhanced logging
 * @param {Object} logger - Enhanced logger instance
 * @param {Object} config - Axios configuration (optional)
 * @returns {Object} Axios instance with request/response interceptors for logging
 */
export const createLoggingHttpClient = (logger, config = {}) => {
  // Create axios instance with provided config
  const instance = axios.create({
    timeout: 30000, // 30 second timeout
    ...config
  });
  
  // Log instance creation
  logger.info('HTTP client created', {
    component: 'HTTP',
    operation: 'ClientCreate',
    data: {
      baseURL: config.baseURL || 'none',
      timeout: config.timeout || 30000,
      headers: config.headers ? Object.keys(config.headers) : []
    }
  });
  
  // Add request interceptor for logging
  instance.interceptors.request.use(
    (config) => {
      const requestId = Math.random().toString(36).substring(2, 15);
      config.metadata = { 
        requestId,
        startTime: Date.now() 
      };
      
      // Log request details
      logger.debug(`HTTP request: ${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url}`, {
        component: 'HTTP',
        operation: 'Request',
        data: {
          requestId,
          method: config.method?.toUpperCase() || 'UNKNOWN',
          url: config.url,
          baseURL: config.baseURL,
          headers: sanitizeHeaders(config.headers),
          params: config.params,
          timeout: config.timeout,
          dataSize: config.data ? JSON.stringify(config.data).length : 0
        }
      });
      
      return config;
    },
    (error) => {
      // Log request error
      logger.error('HTTP request setup failed', {
        component: 'HTTP',
        operation: 'RequestError',
        error
      });
      
      return Promise.reject(error);
    }
  );
  
  // Add response interceptor for logging
  instance.interceptors.response.use(
    (response) => {
      const { config } = response;
      const duration = Date.now() - (config.metadata?.startTime || Date.now());
      const requestId = config.metadata?.requestId || 'unknown';
      
      // Log successful response
      logger.info(`HTTP response: ${response.status} ${response.statusText}`, {
        component: 'HTTP',
        operation: 'Response',
        duration,
        data: {
          requestId,
          status: response.status,
          statusText: response.statusText,
          headers: sanitizeHeaders(response.headers),
          url: config.url,
          method: config.method?.toUpperCase() || 'UNKNOWN',
          dataSize: response.data ? JSON.stringify(response.data).length : 0,
          dataSample: getDataSample(response.data)
        }
      });
      
      return response;
    },
    (error) => {
      // Get request config if available
      const { config, response } = error;
      const duration = config ? Date.now() - (config.metadata?.startTime || Date.now()) : 0;
      const requestId = config?.metadata?.requestId || 'unknown';
      
      // Log error response
      logger.error(`HTTP request failed: ${error.message}`, {
        component: 'HTTP',
        operation: 'ResponseError',
        duration,
        data: {
          requestId,
          url: config?.url || 'unknown',
          method: config?.method?.toUpperCase() || 'UNKNOWN',
          status: response?.status || 0,
          statusText: response?.statusText || '',
          headers: response ? sanitizeHeaders(response.headers) : {},
          responseData: response?.data || null
        },
        error
      });
      
      return Promise.reject(error);
    }
  );
  
  // Add convenience methods for common API operations
  const enhancedClient = {
    // Original axios instance
    axios: instance,
    
    /**
     * Make a GET request with enhanced logging
     */
    get: async (url, config = {}) => {
      try {
        // Ensure config is valid and doesn't have "constructor" or other built-in properties
        // that could cause issues with axios
        const safeConfig = typeof config === 'object' && config !== null ? 
          { 
            headers: config.headers || {}, 
            params: config.params || {}, 
            timeout: config.timeout || undefined 
          } : {};
          
        return await instance.get(url, safeConfig);
      } catch (error) {
        logger.logError(`GET request to ${url} failed`, error, 'HTTP', 'GET');
        throw error;
      }
    },
    
    /**
     * Make a POST request with enhanced logging
     */
    post: async (url, data, config = {}) => {
      try {
        // Ensure config is valid
        const safeConfig = typeof config === 'object' && config !== null ? 
          { 
            headers: config.headers || {}, 
            params: config.params || {}, 
            timeout: config.timeout || undefined 
          } : {};
          
        return await instance.post(url, data, safeConfig);
      } catch (error) {
        logger.logError(`POST request to ${url} failed`, error, 'HTTP', 'POST');
        throw error;
      }
    },
    
    /**
     * Make a PUT request with enhanced logging
     */
    put: async (url, data, config = {}) => {
      try {
        // Ensure config is valid
        const safeConfig = typeof config === 'object' && config !== null ? 
          { 
            headers: config.headers || {}, 
            params: config.params || {}, 
            timeout: config.timeout || undefined 
          } : {};
          
        return await instance.put(url, data, safeConfig);
      } catch (error) {
        logger.logError(`PUT request to ${url} failed`, error, 'HTTP', 'PUT');
        throw error;
      }
    },
    
    /**
     * Make a DELETE request with enhanced logging
     */
    delete: async (url, config = {}) => {
      try {
        // Ensure config is valid
        const safeConfig = typeof config === 'object' && config !== null ? 
          { 
            headers: config.headers || {}, 
            params: config.params || {}, 
            timeout: config.timeout || undefined 
          } : {};
          
        return await instance.delete(url, safeConfig);
      } catch (error) {
        logger.logError(`DELETE request to ${url} failed`, error, 'HTTP', 'DELETE');
        throw error;
      }
    }
  };
  
  return enhancedClient;
};

// Helper function to sanitize headers (remove sensitive data)
const sanitizeHeaders = (headers) => {
  if (!headers) return {};
  
  const sanitized = { ...headers };
  
  // List of sensitive header fields
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'api-key',
    'token',
    'jwt',
    'secret',
    'password',
    'access-token',
    'refresh-token'
  ];
  
  // Sanitize sensitive headers
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey) || lowerKey.includes('auth') || lowerKey.includes('key')) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Helper function to get a sample of response data
const getDataSample = (data) => {
  if (!data) return null;
  
  try {
    if (Array.isArray(data)) {
      if (data.length === 0) return [];
      
      // For arrays, return the first item
      return data.length > 0 ? data[0] : null;
    } else if (typeof data === 'object') {
      // For objects, return a sample with limited size
      const sample = {};
      const keys = Object.keys(data).slice(0, 5);
      
      keys.forEach(key => {
        const value = data[key];
        if (Array.isArray(value)) {
          sample[key] = value.length > 0 ? `Array(${value.length})` : '[]';
        } else if (typeof value === 'object' && value !== null) {
          sample[key] = '{...}';
        } else {
          sample[key] = value;
        }
      });
      
      if (Object.keys(data).length > 5) {
        sample['...'] = `${Object.keys(data).length - 5} more fields`;
      }
      
      return sample;
    }
    
    // For primitive values, return as is
    return data;
  } catch (e) {
    return `[Error getting sample: ${e.message}]`;
  }
}; 