import { FileText } from 'lucide-react';

interface WaterManagementPlanProps {
  amphure?: string;
  province?: string;
}

export const WaterManagementPlan = ({ amphure, province }: WaterManagementPlanProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-medium">แผนการบริหารจัดการน้ำ</h3>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">พื้นที่</p>
          <p className="text-gray-700">{amphure} {province}</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">แผนระยะสั้น (1-3 เดือน)</p>
            <p className="text-gray-700">
              ติดตามสถานการณ์น้ำอย่างใกล้ชิด และเตรียมความพร้อมอุปกรณ์สูบน้ำ
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">แผนระยะกลาง (3-6 เดือน)</p>
            <p className="text-gray-700">
              ขุดลอกคูคลอง และปรับปรุงระบบระบายน้ำในพื้นที่เสี่ยง
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">แผนระยะยาว (6-12 เดือน)</p>
            <p className="text-gray-700">
              ก่อสร้างระบบป้องกันน้ำท่วมเพิ่มเติม และพัฒนาระบบเตือนภัยน้ำท่วม
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          มีการดำเนินการตามแผนอย่างต่อเนื่อง และติดตามผลทุกเดือน
        </p>
      </div>
    </div>
  );
}; 