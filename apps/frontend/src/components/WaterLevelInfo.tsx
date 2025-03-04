import { Droplet } from 'lucide-react';

interface WaterLevelInfoProps {
  amphure?: string;
  province?: string;
}

export const WaterLevelInfo = ({ amphure, province }: WaterLevelInfoProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Droplet className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-medium">ข้อมูลระดับน้ำ</h3>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">พื้นที่</p>
            <p className="text-gray-700">{amphure} {province}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">ระดับน้ำปัจจุบัน</p>
            <p className="text-gray-700">2.5 เมตร</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">ระดับน้ำต่ำสุด</p>
            <p className="text-gray-700">1.8 เมตร</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">ระดับน้ำสูงสุด</p>
            <p className="text-gray-700">3.2 เมตร</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          ระดับน้ำอยู่ในเกณฑ์ปกติ ไม่มีความเสี่ยงน้ำท่วม
        </p>
      </div>
    </div>
  );
}; 