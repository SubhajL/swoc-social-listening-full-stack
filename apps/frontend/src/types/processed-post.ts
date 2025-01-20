export enum CategoryName {
  REPORT_INCIDENT = 'การรายงานและแจ้งเหตุ',
  REQUEST_SUPPORT = 'การขอการสนับสนุน',
  REQUEST_INFO = 'การขอข้อมูล',
  SUGGESTION = 'ข้อเสนอแนะ'
}

export interface ProcessedPost {
  processed_post_id: string;
  category_name: CategoryName;
  sub1_category_name: string;
  location: {
    latitude: number;
    longitude: number;
    source: 'coordinates' | 'address' | 'both';
    address?: string;
    tumbon?: string;
    amphure?: string;
    province?: string;
    irrigation_office?: string;
  };
  status: 'unprocessed' | 'processing' | 'resolved';
  created_at: string;
  updated_at: string;
  nearest_sensor_id?: string;
}

export const CategoryIconMap = {
  [CategoryName.REPORT_INCIDENT]: 'circle',
  [CategoryName.REQUEST_SUPPORT]: 'triangle',
  [CategoryName.REQUEST_INFO]: 'square',
  [CategoryName.SUGGESTION]: 'hexa'
} as const;

export const SubCategories: Record<CategoryName, string[]> = {
  [CategoryName.REPORT_INCIDENT]: [
    'All',
    'อาคารชลประทานชำรุด',
    'สถานการณ์น้ำท่วม',
    'สถานการณ์น้ำแล้ง',
    'ดำเนินการปลอดภัยอื่นๆ อาทิ หญ้าขึ้นสูงบังวิสัยทัศน์ และอื่นๆ'
  ],
  [CategoryName.REQUEST_SUPPORT]: [
    'All',
    'เพิ่ม/ลด การปล่อยน้ำ',
    'การขอความสนับสนุนเครื่องมือเครื่องจักร',
    'เปิด/ปิด ประตูน้ำ',
    'มาตรการรองรับฤดูฝน',
    'มาตรการรองรับฤดูแล้ง',
    'แนวทาง/มาตรการรับมือพื้นที่เสี่ยงน้ำท่วม',
    'แนวทาง/มาตรการรับมือพื้นที่น้ำท่วมซ้ำซาก',
    'แนวทาง/มาตรการรับมือพื้นที่เสี่ยงภัยแล้ง',
    'แนวทาง/มาตรการรับมือพื้นที่เสี่ยงภัยแล้งซ้ำซาก',
    'การเตรียมความพร้อมอาคารชลประทาน',
    'การขอความสนับสนุนนอกพื้นที่ชลประทาน',
    'การขอใช้พื้นที่',
    'การก่อสร้างแหล่งน้ำ/สถานีสูบน้ำชุมชน',
    'การแก้ไขปัญหาวัชพืช',
    'ข้อมูลในระบบสารสนเทศกรมชลประทานสูญหาย'
  ],
  [CategoryName.REQUEST_INFO]: [
    'All',
    'สภาพฝน',
    'สภาพแล้ง',
    'แหล่งข้อมูลฝน',
    'การจัดลำดับความสำคัญการใช้น้ำ',
    'แหล่งน้ำกรมชลประทานรับผิดชอบ',
    'หลักการบริหารจัดการอ่างเก็บน้ำ',
    'การดำเนินการร่วมกับหน่วยงานอื่น',
    'พื้นที่เสี่ยงน้ำท่วม',
    'พื้นที่เสี่ยงภัยแล้ง',
    'พื้นที่น้ำท่วมซ้ำซาก',
    'การจ่ายค่าไฟฟ้าสำหรับอาคารชลประทาน',
    'ข้อมูลการติดต่อ',
    'ช่องทางการแจ้งเตือนสถานการณ์ในพื้นที่',
    'การใช้งานระบบ/อุปกรณ์',
    'แผนงานโครงการเพื่อการแก้ไขปัญหา'
  ],
  [CategoryName.SUGGESTION]: ['All']
}

export const IrrigationOffices = [
  'สำนักงานชลประทานที่ 1',
  'สำนักงานชลประทานที่ 2',
  'สำนักงานชลประทานที่ 3',
  'สำนักงานชลประทานที่ 4',
  'สำนักงานชลประทานที่ 5',
  'สำนักงานชลประทานที่ 6',
  'สำนักงานชลประทานที่ 7',
  'สำนักงานชลประทานที่ 8',
  'สำนักงานชลประทานที่ 9',
  'สำนักงานชลประทานที่ 10',
  'สำนักงานชลประทานที่ 11',
  'สำนักงานชลประทานที่ 12',
  'สำนักงานชลประทานที่ 13',
  'สำนักงานชลประทานที่ 14',
  'สำนักงานชลประทานที่ 15',
  'สำนักงานชลประทานที่ 16',
  'สำนักงานชลประทานที่ 17'
] as const;

export type IrrigationOffice = typeof IrrigationOffices[number]; 