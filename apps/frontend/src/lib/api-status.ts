// api-status.ts - Utility for checking API server health
import { API_BASE_URL } from './config';
import axios from 'axios';

// Time window between consecutive API status checks (in milliseconds)
const API_CHECK_INTERVAL = 10000; // 10 seconds
let lastCheckTime = 0;
let cachedStatus: boolean | null = null;

// Sample of possible API endpoints to check, in order of preference
const API_ENDPOINTS = [
  '/api/health',
  '/api',
  '/api/'
];

/**
 * Check if the API server is running and accessible
 * Tries multiple endpoints and considers 2xx, 3xx or even 404 responses as "running"
 * since a 404 on a valid path means the server is responding
 */
export const checkApiStatus = async (force = false): Promise<boolean> => {
  const now = Date.now();
  
  // Return cached result if checked recently
  if (!force && cachedStatus !== null && now - lastCheckTime < API_CHECK_INTERVAL) {
    console.log('🔄 [API Status] Skipping check - too soon since last check');
    return cachedStatus;
  }
  
  console.log('🔄 [API Status] Checking API status');
  
  // Try all endpoints in order until one succeeds
  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`🔄 [API Status] Trying endpoint: ${endpoint}`);
      
      // Use axios to make the request
      const response = await axios.get(endpoint, {
        timeout: 5000, // 5 second timeout
        validateStatus: (status) => status < 500 // Accept any non-5xx response
      });
      
      console.log(`✅ [API Status] API server is running (endpoint: ${endpoint}, status: ${response.status})`);
      
      // Update cache and timestamp
      lastCheckTime = now;
      cachedStatus = true;
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        
        // Even a 404 means the server is running, just not that endpoint
        if (status && status < 500) {
          console.log(`✅ [API Status] API server is running but returned status ${status} for ${endpoint}`);
          
          // Update cache and timestamp
          lastCheckTime = now;
          cachedStatus = true;
          return true;
        }
        
        console.error(`❌ [API Status] Error checking endpoint ${endpoint}:`, error.message);
      } else {
        console.error(`❌ [API Status] Unknown error checking endpoint ${endpoint}:`, error);
      }
    }
  }
  
  // All endpoints failed
  console.error('❌ [API Status] API server appears to be down');
  
  // Update cache and timestamp
  lastCheckTime = now;
  cachedStatus = false;
  return false;
}; 