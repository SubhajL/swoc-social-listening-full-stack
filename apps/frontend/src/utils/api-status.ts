import axiosInstance from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';

/**
 * API status check utility
 * This utility provides functions to check if the API server is running
 * and provides clear feedback to the user.
 */

// API status check configuration
const API_STATUS_CONFIG = {
  ENDPOINTS: [
    '/health',
    '/status',
    '/',
    '/posts/unprocessed'
  ],
  TIMEOUT: 5000,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000
};

/**
 * Check if the API server is running
 * @returns Promise<boolean> - True if API is available, false otherwise
 */
export async function checkApiStatus(): Promise<boolean> {
  console.log('🔄 [API Status] Checking API status');
  
  // Try each endpoint in sequence
  for (const endpoint of API_STATUS_CONFIG.ENDPOINTS) {
    try {
      console.log(`🔄 [API Status] Trying endpoint: ${endpoint}`);
      
      const response = await axiosInstance.get(endpoint, {
        timeout: API_STATUS_CONFIG.TIMEOUT,
        validateStatus: (status) => status < 500 // Accept any non-server error status
      });
      
      // If we get any response (even 404), the server is running
      // We just need to know the server is up, not that the specific endpoint works
      console.log(`✅ [API Status] API server is running (endpoint: ${endpoint}, status: ${response.status})`);
      return true;
    } catch (error) {
      console.log(`❌ [API Status] Failed to connect to endpoint ${endpoint}:`, error);
      // Continue to next endpoint
    }
  }
  
  // If we've tried all endpoints and none worked, the API is not available
  console.error('❌ [API Status] API server is not available after trying all endpoints');
  return false;
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