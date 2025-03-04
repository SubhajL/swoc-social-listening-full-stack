import { Button } from "@/components/ui/button";
import { checkApiStatus } from "@/utils/api-status";
import { useState } from "react";

interface ApiConnectionErrorProps {
  onRetry?: () => void;
  message?: string;
}

export function ApiConnectionError({
  onRetry,
  message = "ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์ได้"
}: ApiConnectionErrorProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    
    try {
      const isRunning = await checkApiStatus();
      
      if (isRunning) {
        console.log('✅ API server is now running');
        onRetry?.();
      } else {
        console.log('❌ API server is still not running');
      }
    } catch (error) {
      console.error('❌ Error checking API status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white/90 rounded-lg p-8 text-center">
      <div className="w-20 h-20 mb-6 text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">ไม่สามารถเชื่อมต่อได้</h2>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {message}
      </p>
      
      <div className="space-y-4">
        <p className="text-gray-500 text-sm">
          กรุณาตรวจสอบว่า API เซิร์ฟเวอร์กำลังทำงานอยู่ที่ <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000</code>
        </p>
        
        <Button
          onClick={handleRetry}
          disabled={isChecking}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          {isChecking ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              กำลังตรวจสอบ...
            </>
          ) : (
            'ลองใหม่อีกครั้ง'
          )}
        </Button>
      </div>
    </div>
  );
} 