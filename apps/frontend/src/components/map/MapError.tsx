import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ApiConnectionError } from '@/components/ApiConnectionError';

interface MapErrorProps {
  error?: Error | null;
  message?: string;
  onRetry?: () => void;
}

const MapError: React.FC<MapErrorProps> = ({ error, message, onRetry }) => {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error || message) {
      setShowError(true);
    }
  }, [error, message]);

  if (!showError) {
    return null;
  }

  // Use the provided message or the error message
  const errorMessage = message || (error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุในการโหลดแผนที่');

  // Check if this is a network error
  const isNetworkError = error?.message?.includes('Network Error') || 
                         error?.message?.includes('Failed to fetch') ||
                         error?.message?.includes('NetworkError') ||
                         error?.message?.includes('ECONNREFUSED');

  // If it's a network error, show the API connection error component
  if (isNetworkError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
        <ApiConnectionError 
          onRetry={() => {
            setShowError(false);
            onRetry?.();
          }}
          message="ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์เพื่อโหลดข้อมูลแผนที่ได้"
        />
      </div>
    );
  }

  // For other errors, show the standard error alert
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
      <Alert variant="destructive" className="mb-4 max-w-md">
        <AlertTitle>เกิดข้อผิดพลาดในการโหลดแผนที่</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-4">{errorMessage}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowError(false);
                onRetry();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              ลองใหม่อีกครั้ง
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default MapError;
