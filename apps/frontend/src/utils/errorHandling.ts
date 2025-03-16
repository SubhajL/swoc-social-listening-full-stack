import { toast } from '@/components/ui/use-toast';

/**
 * Error sources for better categorization
 */
export type ErrorSource = 
  | 'navigation'       // Navigation/routing errors
  | 'stationManagement' // Station data management errors
  | 'uiState'          // UI state management errors
  | 'apiCall'          // API/network request errors
  | 'validation'       // Data validation errors
  | 'auth'             // Authentication errors
  | 'storage'          // Local/session storage errors
  | 'unknown';         // Uncategorized errors

/**
 * Error context interface for structured error handling
 */
export interface ErrorContext {
  source: ErrorSource;
  operation: string;
  originalError: Error;
  component?: string;
  details?: Record<string, any>;
  recoveryAttempted?: boolean;
  recoveryOptions?: {
    retry?: () => Promise<any>;
    fallback?: () => void;
    redirect?: string;
  };
  timestamp?: number;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Options for error handling
 */
export interface ErrorHandlingOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  logToService?: boolean;
  severity?: ErrorSeverity;
  attemptRecovery?: boolean;
}

// Error handling configuration
const ERROR_CONFIG = {
  // Maximum number of retry attempts for API calls
  MAX_RETRY_ATTEMPTS: 3,
  
  // Delay between retry attempts (in ms)
  RETRY_DELAY: 1000,
  
  // API timeout threshold (in ms)
  API_TIMEOUT_THRESHOLD: 10000,
  
  // Enable detailed error logging
  DETAILED_LOGGING: true,
  
  // Enable automatic recovery attempts
  AUTO_RECOVERY: true,
  
  // Enable error analytics
  ERROR_ANALYTICS: true
};

/**
 * Default error handling options
 */
const defaultOptions: ErrorHandlingOptions = {
  showToast: true,
  logToConsole: true,
  logToService: false,
  severity: 'error',
  attemptRecovery: true
};

/**
 * Main error handling function
 * @param context Error context information
 * @param options Error handling options
 */
export function handleError(context: ErrorContext, options: ErrorHandlingOptions = {}): void {
  const mergedOptions = { ...defaultOptions, ...options };
  const { showToast, logToConsole, logToService, attemptRecovery } = mergedOptions;
  // Ensure severity is always defined by using default if undefined
  const severity: ErrorSeverity = mergedOptions.severity || 'error';
  
  // 1. Log to console if enabled
  if (logToConsole) {
    logErrorToConsole(context, severity);
  }
  
  // 2. Show toast notification if enabled
  if (showToast) {
    showErrorToast(context, severity);
  }
  
  // 3. Log to error reporting service if enabled
  if (logToService) {
    logErrorToService(context, severity);
  }
  
  // 4. Attempt recovery if enabled
  if (attemptRecovery) {
    attemptErrorRecovery(context);
  }
}

/**
 * Log error to console with structured format
 */
function logErrorToConsole(context: ErrorContext, severity: ErrorSeverity): void {
  const { source, operation, details, originalError, component } = context;
  const componentPrefix = component ? `[${component}] ` : '';
  const errorPrefix = `${componentPrefix}Error in ${source}/${operation}:`;
  
  switch (severity) {
    case 'info':
      console.info(errorPrefix, {
        ...details,
        error: originalError
      });
      break;
    case 'warning':
      console.warn(errorPrefix, {
        ...details,
        error: originalError
      });
      break;
    case 'critical':
      console.error(`CRITICAL ${errorPrefix}`, {
        ...details,
        error: originalError,
        stack: originalError?.stack
      });
      break;
    case 'error':
    default:
      console.error(errorPrefix, {
        ...details,
        error: originalError
      });
      break;
  }
}

/**
 * Show toast notification based on error context
 */
function showErrorToast(context: ErrorContext, severity: ErrorSeverity): void {
  const { source, operation, originalError, recoveryOptions } = context;
  
  // Get user-friendly error message based on error source and details
  const errorMessage = getUserFriendlyErrorMessage(context);
  
  // Determine toast title based on error source
  let title = 'Error';
  switch (source) {
    case 'navigation':
      title = 'ข้อผิดพลาดในการนำทาง';
      break;
    case 'stationManagement':
      title = 'ข้อผิดพลาดในการจัดการสถานี';
      break;
    case 'apiCall':
      title = 'ข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
      break;
    case 'validation':
      title = 'ข้อผิดพลาดในการตรวจสอบข้อมูล';
      break;
    case 'auth':
      title = 'ข้อผิดพลาดในการยืนยันตัวตน';
      break;
    case 'storage':
      title = 'ข้อผิดพลาดในการจัดการข้อมูล';
      break;
    default:
      title = 'ข้อผิดพลาด';
  }
  
  // Create toast actions if recovery options are available
  let action = undefined;
  
  // We'll skip the JSX action button for now since it's causing linter errors
  // and we'll implement it differently in a separate component
  
  // Show toast with appropriate variant
  if (toast) {
    switch (severity) {
      case 'info':
        toast({
          title,
          description: errorMessage,
          variant: 'default'
        });
        break;
      case 'warning':
        toast({
          title,
          description: errorMessage,
          variant: 'default'
        });
        break;
      case 'critical':
      case 'error':
      default:
        toast({
          title,
          description: errorMessage,
          variant: 'destructive',
          duration: 8000 // Show longer for critical errors
        });
        break;
    }
  }
}

/**
 * Get user-friendly error message based on error context
 */
function getUserFriendlyErrorMessage(context: ErrorContext): string {
  const { source, operation, originalError } = context;
  const errorMessage = originalError?.message || 'An unknown error occurred';
  
  // Network/API error messages
  if (source === 'apiCall') {
    if (errorMessage.includes('timeout')) {
      return 'การเชื่อมต่อกับเซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
      return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
    } else if (errorMessage.includes('404')) {
      return 'ไม่พบข้อมูลที่ต้องการ กรุณาติดต่อผู้ดูแลระบบ';
    } else if (errorMessage.includes('500')) {
      return 'เซิร์ฟเวอร์เกิดข้อผิดพลาด กรุณาลองใหม่ในภายหลัง';
    } else if (errorMessage.includes('503')) {
      return 'เซิร์ฟเวอร์ไม่พร้อมให้บริการในขณะนี้ กรุณาลองใหม่ในภายหลัง';
    } else if (errorMessage.includes('504')) {
      return 'การเชื่อมต่อกับเซิร์ฟเวอร์หมดเวลา กรุณาลองใหม่ในภายหลัง';
    } else if (errorMessage.includes('403')) {
      return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้ กรุณาติดต่อผู้ดูแลระบบ';
    } else if (errorMessage.includes('401')) {
      return 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
    } else if (errorMessage.includes('validation')) {
      return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ป้อนและลองใหม่อีกครั้ง';
    } else if (errorMessage.includes('abort')) {
      return 'การเชื่อมต่อถูกยกเลิก กรุณาลองใหม่อีกครั้ง';
    } else if (errorMessage.includes('CORS')) {
      return 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ';
    }
    return `ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ${errorMessage}`;
  }
  
  // Navigation error messages
  if (source === 'navigation') {
    if (operation.includes('back')) {
      return 'ไม่สามารถย้อนกลับได้ กรุณาใช้เมนูหลักเพื่อนำทาง';
    } else if (operation.includes('forward')) {
      return 'ไม่สามารถไปข้างหน้าได้ กรุณาใช้เมนูหลักเพื่อนำทาง';
    } else if (operation.includes('route')) {
      return 'ไม่สามารถนำทางไปยังหน้าที่ต้องการได้ กรุณาลองใหม่อีกครั้ง';
    }
    return 'เกิดข้อผิดพลาดในการนำทาง กรุณาใช้เมนูหลักเพื่อนำทาง';
  }
  
  // Station management error messages
  if (source === 'stationManagement') {
    if (operation.includes('add')) {
      return 'ไม่สามารถเพิ่มสถานีได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง';
    } else if (operation.includes('remove')) {
      return 'ไม่สามารถลบสถานีได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('update')) {
      return 'ไม่สามารถอัปเดตข้อมูลสถานีได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('toggle')) {
      return 'ไม่สามารถเปลี่ยนสถานะการแสดงผลของสถานีได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('save')) {
      return 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('discard')) {
      return 'ไม่สามารถยกเลิกการเปลี่ยนแปลงได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('synchronize')) {
      return 'ไม่สามารถซิงโครไนซ์ข้อมูลสถานีได้ กรุณาลองใหม่อีกครั้ง';
    }
    return 'เกิดข้อผิดพลาดในการจัดการข้อมูลสถานี กรุณาลองใหม่อีกครั้ง';
  }
  
  // Authentication error messages
  if (source === 'auth') {
    if (operation.includes('login')) {
      return 'ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน';
    } else if (operation.includes('logout')) {
      return 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('token')) {
      return 'เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
    } else if (operation.includes('permission')) {
      return 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ กรุณาติดต่อผู้ดูแลระบบ';
    }
    return 'เกิดข้อผิดพลาดในการยืนยันตัวตน กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
  }
  
  // Validation error messages
  if (source === 'validation') {
    return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่ป้อนและลองใหม่อีกครั้ง';
  }
  
  // Storage error messages
  if (source === 'storage') {
    if (operation.includes('read')) {
      return 'ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('write')) {
      return 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
    } else if (operation.includes('delete')) {
      return 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
    }
    return 'เกิดข้อผิดพลาดในการจัดการข้อมูล กรุณาลองใหม่อีกครั้ง';
  }
  
  // Default error message
  return 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง';
}

/**
 * Log error to external error reporting service
 * This is a placeholder for integration with services like Sentry, LogRocket, etc.
 */
function logErrorToService(context: ErrorContext, severity: ErrorSeverity): void {
  // This would be implemented to send errors to your error reporting service
  // Example with Sentry:
  // 
  // import * as Sentry from '@sentry/browser';
  // 
  // Sentry.captureException(context.originalError, {
  //   level: severity === 'critical' ? 'fatal' : severity,
  //   tags: {
  //     source: context.source,
  //     operation: context.operation,
  //     component: context.component
  //   },
  //   extra: context.details
  // });
  
  console.log('Error would be sent to reporting service:', {
    context,
    severity
  });
}

/**
 * Attempt to recover from error based on error type
 */
function attemptErrorRecovery(context: ErrorContext): void {
  const { source, operation, recoveryAttempted, recoveryOptions } = context;
  
  // Skip if recovery was already attempted to prevent loops
  if (recoveryAttempted) {
    return;
  }
  
  // Mark that recovery was attempted
  context.recoveryAttempted = true;
  
  try {
    console.log(`[ErrorHandling] Attempting recovery for ${source}/${operation}`);
    
    // If recovery options are provided, use them
    if (recoveryOptions) {
      if (recoveryOptions.fallback) {
        console.log(`[ErrorHandling] Using fallback for ${source}/${operation}`);
        recoveryOptions.fallback();
        return;
      }
      
      if (recoveryOptions.redirect) {
        console.log(`[ErrorHandling] Redirecting to ${recoveryOptions.redirect} for ${source}/${operation}`);
        window.location.href = recoveryOptions.redirect;
        return;
      }
    }
    
    // Implement recovery strategies based on error source
    switch (source) {
      case 'navigation':
        // For navigation errors, could try alternative routes or reset navigation state
        console.log('[ErrorHandling] Attempting navigation recovery');
        // Could redirect to a safe page like home
        break;
      
      case 'apiCall':
        // For API errors, could try to use cached data
        console.log('[ErrorHandling] Attempting API call recovery');
        // Could check for cached data in localStorage or IndexedDB
        break;
      
      case 'storage':
        // For storage errors, could try to clear corrupted data
        console.log('[ErrorHandling] Attempting storage recovery');
        try {
          // Clear potentially corrupted data
          if (operation.includes('localStorage')) {
            localStorage.clear();
            console.log('[ErrorHandling] Cleared localStorage');
          } else if (operation.includes('sessionStorage')) {
            sessionStorage.clear();
            console.log('[ErrorHandling] Cleared sessionStorage');
          }
        } catch (e) {
          console.error('[ErrorHandling] Failed to clear storage:', e);
        }
        break;
      
      case 'auth':
        // For auth errors, could redirect to login
        console.log('[ErrorHandling] Attempting auth recovery');
        if (operation.includes('token') || operation.includes('expired')) {
          // Clear auth data
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
          } catch (e) {
            console.error('[ErrorHandling] Failed to clear auth data:', e);
          }
          
          // Redirect to login page
          // window.location.href = '/login';
        }
        break;
      
      default:
        // No specific recovery strategy
        console.log('[ErrorHandling] No specific recovery strategy for', source);
        break;
    }
  } catch (recoveryError) {
    console.error('[ErrorHandling] Recovery attempt failed:', recoveryError);
  }
}

/**
 * Create a typed error with source information
 */
export function createTypedError(
  message: string,
  source: ErrorSource,
  operation: string,
  details?: Record<string, any>
): Error {
  const error = new Error(message);
  (error as any).source = source;
  (error as any).operation = operation;
  (error as any).details = details;
  return error;
}

/**
 * Helper function to safely parse error from any source
 */
export function parseError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  return new Error(JSON.stringify(error));
}

/**
 * Helper function to extract error details from API responses
 */
export function extractApiErrorDetails(response: any): Record<string, any> {
  try {
    // Extract error details from common API response formats
    if (response?.data?.error) {
      return response.data.error;
    }
    
    if (response?.data?.message) {
      return { message: response.data.message };
    }
    
    if (response?.status && response?.statusText) {
      return { 
        status: response.status,
        statusText: response.statusText
      };
    }
    
    if (response?.message) {
      return { message: response.message };
    }
    
    return { raw: JSON.stringify(response) };
  } catch (e) {
    return { parseError: 'Could not extract API error details' };
  }
}

/**
 * Helper function to create a retry function for API calls
 */
export function createRetryFunction(
  apiCall: () => Promise<any>,
  maxRetries: number = ERROR_CONFIG.MAX_RETRY_ATTEMPTS,
  delay: number = ERROR_CONFIG.RETRY_DELAY
): () => Promise<any> {
  let attempts = 0;
  
  const retry = async (): Promise<any> => {
    try {
      attempts++;
      console.log(`[ErrorHandling] Retry attempt ${attempts}/${maxRetries}`);
      
      // Add exponential backoff
      const backoffDelay = delay * Math.pow(2, attempts - 1);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return await apiCall();
    } catch (error) {
      if (attempts < maxRetries) {
        console.log(`[ErrorHandling] Retry failed, attempting again (${attempts}/${maxRetries})`);
        return retry();
      } else {
        console.error(`[ErrorHandling] All ${maxRetries} retry attempts failed`);
        throw error;
      }
    }
  };
  
  return retry;
}

/**
 * Helper function to detect API timeouts
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('etimedout') ||
      errorMessage.includes('504')
    );
  }
  return false;
}

/**
 * Helper function to detect network errors
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('network') ||
      errorMessage.includes('internet') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('offline') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('enotfound')
    );
  }
  return false;
}

/**
 * Helper function to detect server errors
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504') ||
      errorMessage.includes('internal server error')
    );
  }
  return false;
}

/**
 * Helper function to detect authentication errors
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('401') ||
      errorMessage.includes('403') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('token')
    );
  }
  return false;
}

// Add global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[ErrorHandling] Unhandled promise rejection:', event.reason);
    
    handleError({
      source: 'unknown',
      operation: 'unhandledRejection',
      originalError: parseError(event.reason),
      details: {
        type: 'unhandledRejection'
      }
    });
    
    // Prevent the default browser behavior
    event.preventDefault();
  });
}

// Declare analytics for TypeScript
declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: any) => void;
    };
  }
} 