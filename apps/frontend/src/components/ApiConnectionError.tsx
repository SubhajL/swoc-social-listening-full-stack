import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useRealTime } from '@/contexts/RealTimeContext';

interface ApiConnectionErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const ApiConnectionError = ({ 
  message,
  onRetry 
}: ApiConnectionErrorProps = {}) => {
  const { isConnected, connectionError } = useRealTime();
  
  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Alert className="max-w-md w-full mb-4 border-red-500 bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <AlertTitle className="text-red-700 text-lg font-semibold">
          เกิดข้อผิดพลาด
        </AlertTitle>
        <AlertDescription className="text-red-600 mt-2">
          <p>{message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'}</p>
          <p className="text-sm mt-2">ไม่สามารถเชื่อมต่อกับ API เซิร์ฟเวอร์ได้</p>
          
          {connectionError && (
            <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800">
              <p className="font-semibold">รายละเอียดข้อผิดพลาด:</p>
              <p>{connectionError}</p>
            </div>
          )}
          
          <div className="mt-4 text-sm">
            <p>สถานะการเชื่อมต่อ: {isConnected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}</p>
          </div>
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-col gap-4 items-center">
        <Button 
          onClick={handleRefresh} 
          variant="default"
          className="mt-4"
        >
          ลองใหม่อีกครั้ง
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/'}
          className="text-muted-foreground"
        >
          กลับไปหน้าหลัก
        </Button>
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        <h3 className="font-medium mb-2">วิธีแก้ไขปัญหา:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>ตรวจสอบว่าเซิร์ฟเวอร์ Backend กำลังทำงานอยู่</li>
          <li>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ</li>
          <li>รีเฟรชหน้านี้ในภายหลัง</li>
          <li>ถ้าปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ</li>
        </ul>
      </div>
    </div>
  );
}; 