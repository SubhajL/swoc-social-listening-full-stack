import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Info } from 'lucide-react';
import { handleError, parseError, isNetworkError, isServerError, isTimeoutError } from '@/utils/errorHandling';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'network' | 'server' | 'timeout' | 'unknown';
}

/**
 * Enhanced ErrorBoundary component for catching unhandled errors in React components
 * and displaying a user-friendly error message with recovery options.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown'
    };
    
    // Bind methods
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.handleGoBack = this.handleGoBack.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type
    let errorType: 'network' | 'server' | 'timeout' | 'unknown' = 'unknown';
    
    if (isNetworkError(error)) {
      errorType = 'network';
    } else if (isServerError(error)) {
      errorType = 'server';
    } else if (isTimeoutError(error)) {
      errorType = 'timeout';
    }
    
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo
    });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Use our centralized error handling
    handleError({
      source: 'unknown',
      operation: 'componentRender',
      originalError: error,
      component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown',
      details: {
        componentStack: errorInfo.componentStack
      }
    });
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset the error state if props change and resetOnPropsChange is true
    if (
      this.state.hasError &&
      this.props.resetOnPropsChange &&
      prevProps !== this.props
    ) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorType: 'unknown'
      });
    }
  }
  
  // Handler for reset button
  handleReset(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown'
    });
  }
  
  // Handler for reload button
  handleReload(): void {
    window.location.reload();
  }
  
  // Handler for go home button
  handleGoHome(): void {
    window.location.href = '/';
  }
  
  // Handler for go back button
  handleGoBack(): void {
    window.history.back();
  }
  
  // Get error message based on error type
  getErrorMessage(): string {
    const { errorType } = this.state;
    
    switch (errorType) {
      case 'network':
        return 'เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณและลองใหม่อีกครั้ง';
      case 'server':
        return 'เซิร์ฟเวอร์เกิดข้อผิดพลาด กรุณาลองใหม่ในภายหลัง หรือติดต่อผู้ดูแลระบบ';
      case 'timeout':
        return 'การเชื่อมต่อกับเซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณและลองใหม่อีกครั้ง';
      default:
        return 'ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิดขึ้นในแอปพลิเคชัน กรุณาลองใหม่อีกครั้ง';
    }
  }
  
  // Get error icon based on error type
  getErrorIcon(): ReactNode {
    const { errorType } = this.state;
    
    switch (errorType) {
      case 'network':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'server':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'timeout':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  }
  
  // Get suggested actions based on error type
  getSuggestedActions(): string {
    const { errorType } = this.state;
    
    switch (errorType) {
      case 'network':
        return 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ หรือลองรีเฟรชหน้า';
      case 'server':
        return 'ลองใหม่ในภายหลัง หรือติดต่อผู้ดูแลระบบ';
      case 'timeout':
        return 'ตรวจสอบความเร็วอินเทอร์เน็ตของคุณ หรือลองใหม่อีกครั้ง';
      default:
        return 'ลองรีเฟรชหน้า หรือกลับไปยังหน้าหลัก';
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If a fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise, show our enhanced error UI
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start">
              {this.getErrorIcon()}
              <div className="ml-4">
                <AlertTitle className="text-lg font-semibold mb-2">
                  เกิดข้อผิดพลาดในแอปพลิเคชัน
                </AlertTitle>
                
                <AlertDescription className="text-base">
                  <p className="mb-4">
                    {this.getErrorMessage()}
                  </p>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <Info className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="font-medium">คำแนะนำ:</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {this.getSuggestedActions()}
                    </p>
                  </div>
                  
                  {this.props.showErrorDetails && this.state.error && (
                    <div className="bg-gray-800 text-white p-4 rounded-md mb-4 overflow-auto max-h-40">
                      <p className="font-mono text-sm">{this.state.error.toString()}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-6">
                    <Button onClick={this.handleReset} className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      ลองใหม่อีกครั้ง
                    </Button>
                    <Button variant="outline" onClick={this.handleReload} className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      รีเฟรชหน้า
                    </Button>
                    <Button variant="secondary" onClick={this.handleGoHome} className="flex items-center">
                      <Home className="h-4 w-4 mr-2" />
                      กลับไปยังหน้าหลัก
                    </Button>
                    <Button variant="ghost" onClick={this.handleGoBack} className="flex items-center">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      ย้อนกลับ
                    </Button>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
          
          {/* Show component stack in development mode */}
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <div className="mt-8 p-4 border border-gray-300 rounded-md">
              <h3 className="text-lg font-semibold mb-2">Component Stack</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 text-xs">
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    // If there's no error, render the children
    return this.props.children;
  }
}

export default ErrorBoundary; 