/**
 * Application Configuration
 * This file defines global configuration settings for API and WebSocket connections.
 */

// Environment detection
const isDev = import.meta.env.DEV;

// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_TIMEOUT = 30000; // 30 seconds

// WebSocket configuration
// For correct proxy handling in development, we need the relative URL path
// In production, we use the absolute URL from environment
export const SOCKET_URL = isDev 
  ? import.meta.env.VITE_WS_URL || window.location.origin.replace(/^http/, 'ws') // Use WebSocket URL or fallback to origin with ws protocol
  : (import.meta.env.VITE_WS_URL || 'http://localhost:3000');
export const SOCKET_RECONNECT_ATTEMPTS = 3;
export const SOCKET_RECONNECT_DELAY = 5000; // 5 seconds
export const SOCKET_TIMEOUT = 10000; // 10 seconds

// Logging configuration
export const ENABLE_DEBUG_LOGGING = import.meta.env.DEV || false;

// Feature flags
export const FEATURES = {
  REALTIME_UPDATES: true
};

// Constants
export const DEFAULT_LANGUAGE = 'th';
export const DEFAULT_THEME = 'light';

/**
 * Log configuration settings during application startup
 * Helps with debugging configuration issues
 */
export function logConfiguration() {
  if (ENABLE_DEBUG_LOGGING) {
    console.log('[Config] Application configuration:', {
      API_BASE_URL,
      SOCKET_URL,
      environment: import.meta.env.MODE,
      isDevelopment: import.meta.env.DEV,
      origin: window.location.origin,
      features: FEATURES
    });
  }
}

/**
 * Get environment-specific configuration
 * @returns Configuration object
 */
export function getEnvironmentConfig() {
  return {
    environment: import.meta.env.MODE,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    apiUrl: API_BASE_URL,
    socketUrl: SOCKET_URL
  };
}

// Export environment configuration for easy access
export const ENV_CONFIG = getEnvironmentConfig();
// Log configuration on import
logConfiguration(); 