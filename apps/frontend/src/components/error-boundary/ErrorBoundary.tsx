import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  componentStack: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    componentStack: null
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      componentStack: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our logging service
    logger.error('Component error', 'ErrorBoundary', error, {
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo,
      componentStack: errorInfo.componentStack || null
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback was provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="bg-red-50 border-b">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-xl text-center text-red-700">เกิดข้อผิดพลาดที่ไม่คาดคิด</CardTitle>
              <CardDescription className="text-center text-red-600">
                แอปพลิเคชันพบข้อผิดพลาดที่ไม่สามารถดำเนินการต่อได้
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {this.state.error && this.state.error.toString()}
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.componentStack && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm overflow-auto max-h-60">
                  <p className="font-medium mb-2 text-gray-700">Component Stack:</p>
                  <pre className="whitespace-pre-wrap break-words text-xs text-gray-600">
                    {this.state.componentStack}
                  </pre>
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-medium mb-2 text-gray-700">รายละเอียดเพิ่มเติม:</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>หากปัญหายังคงอยู่ กรุณาแจ้งผู้ดูแลระบบ</li>
                  <li>ระบุเวลาที่เกิดเหตุการณ์: {new Date().toLocaleString()}</li>
                  <li>URL: {window.location.href}</li>
                </ul>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between bg-gray-50 border-t pt-4">
              <Button variant="outline" onClick={this.handleGoHome}>
                กลับหน้าหลัก
              </Button>
              <Button onClick={this.handleReload}>
                ลองอีกครั้ง
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 