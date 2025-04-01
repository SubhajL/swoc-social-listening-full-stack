import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * A React Error Boundary component that catches JavaScript errors anywhere in its child
 * component tree, logs those errors, and displays a fallback UI instead of crashing.
 * 
 * @example
 * <ErrorBoundary>
 *   <ComponentThatMightError />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    // Reset the error boundary state
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // Call the optional onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
          <AlertDescription>
            <div className="mt-2">
              ระบบพบข้อผิดพลาดในการทำงาน กรุณาลองใหม่อีกครั้ง
            </div>
            {this.state.error && (
              <div className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-24">
                <strong>{this.state.error.toString()}</strong>
              </div>
            )}
            <Button 
              variant="outline" 
              className="mt-3" 
              onClick={this.handleReset}
            >
              ลองใหม่
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
} 