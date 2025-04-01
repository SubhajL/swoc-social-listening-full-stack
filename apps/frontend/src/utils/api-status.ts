import axiosInstance from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import { AxiosError } from 'axios';

/**
 * API status check utility
 * This utility provides functions to check if the API server is running
 * and provides clear feedback to the user.
 */

// API status check configuration
const API_STATUS_CONFIG = {
  ENDPOINTS: [
    '/api/health', // Primary health check endpoint
    '/api/posts/count', // Secondary endpoint
    '/api/users/status' // Tertiary endpoint
  ],
  TIMEOUT: 5000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
  CHECK_INTERVAL: 30000, // 30s between checks
  LAST_CHECK_TIMESTAMP: 0, // To prevent too frequent checks
  MIN_CHECK_INTERVAL: 5000 // Minimum 5s between checks
};

/**
 * Check if the API server is running
 * @returns Promise<boolean> - True if API is available, false otherwise
 */
export async function checkApiStatus(): Promise<boolean> {
  // Prevent checking too frequently
  const now = Date.now();
  if (now - API_STATUS_CONFIG.LAST_CHECK_TIMESTAMP < API_STATUS_CONFIG.MIN_CHECK_INTERVAL) {
    console.log('🔄 [API Status] Skipping check - too soon since last check');
    return false;
  }
  
  API_STATUS_CONFIG.LAST_CHECK_TIMESTAMP = now;
  console.log('🔄 [API Status] Checking API status');
  
  // Use only the first endpoint to reduce load and prevent flooding
  const endpoint = API_STATUS_CONFIG.ENDPOINTS[0];
  
  try {
    console.log(`🔄 [API Status] Trying endpoint: ${endpoint}`);
    
    const response = await axiosInstance.get(endpoint, {
      timeout: API_STATUS_CONFIG.TIMEOUT,
      validateStatus: (status) => status < 500 // Accept any non-server error status
    });
    
    // Log the result of the health check
    console.log(`✅ [API Status] API server is running (endpoint: ${endpoint}, status: ${response.status})`);
    
    // Log the response data for debugging if status is 200
    if (response.status === 200) {
      console.log(`✅ [API Status] Health check response:`, response.data);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ [API Status] Failed to connect to endpoint ${endpoint}:`, error);
    
    // More graceful error handling
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ [API Status] API server connection refused - server may be down');
      } else if (error.code === 'ECONNABORTED') {
        console.error('❌ [API Status] API server connection timeout - server may be overloaded');
      } else if (error.response?.status && error.response.status >= 500) {
        console.error(`❌ [API Status] API server error: ${error.response.status}`);
      }
    }
    
    return false;
  }
}

/**
 * Check API status on application startup
 * Shows a toast notification if the API is not available
 */
export async function checkApiStatusOnStartup(): Promise<void> {
  console.log('🔄 [App] Checking API status on startup');
  
  try {
    const isAvailable = await checkApiStatus();
    
    if (!isAvailable) {
      console.error('❌ [App] API server is not running on startup');
      
      // Show toast notification
      toast({
        title: "API เซิร์ฟเวอร์ไม่พร้อมใช้งาน",
        description: "ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่",
        variant: "destructive",
        duration: 10000, // Show for 10 seconds
      });
    } else {
      console.log('✅ [App] API server is running on startup');
    }
  } catch (error) {
    console.error('❌ [App] API server is not running on startup:', error);
    
    // Show toast notification
    toast({
      title: "ไม่สามารถตรวจสอบสถานะ API เซิร์ฟเวอร์",
      description: "เกิดข้อผิดพลาดในการตรวจสอบสถานะ API เซิร์ฟเวอร์ กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่",
      variant: "destructive",
      duration: 10000, // Show for 10 seconds
    });
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, retries);
      console.log(`Retrying after ${delay}ms (attempt ${retries + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
} 