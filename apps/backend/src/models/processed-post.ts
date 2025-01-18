export enum CategoryName {
  REQUEST_SUPPORT = 'การขอการสนับสนุน/ช่วยดำเนินการ',
  REPORT_INCIDENT = 'การรายงานและแจ้งเหตุ',
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
    address?: string;
    source: 'coordinates' | 'address' | 'both';
    tumbon?: string;
    amphure?: string;
    province?: string;
    irrigation_office?: string;
  };
  status: 'unprocessed' | 'processing' | 'resolved';
  created_at: Date;
  updated_at: Date;
  nearest_sensor_id?: string;
}

export const CategoryIconMap = {
  [CategoryName.REPORT_INCIDENT]: 'circle',
  [CategoryName.REQUEST_SUPPORT]: 'triangle',
  [CategoryName.REQUEST_INFO]: 'square',
  [CategoryName.SUGGESTION]: 'hexa'
} as const;

export const SubCategories = {
  [CategoryName.REPORT_INCIDENT]: ['ทั้งหมด', /* Add sub-categories here */],
  [CategoryName.REQUEST_SUPPORT]: ['ทั้งหมด', /* Add sub-categories here */],
  [CategoryName.REQUEST_INFO]: ['ทั้งหมด', /* Add sub-categories here */],
  [CategoryName.SUGGESTION]: ['ทั้งหมด']
} as const;

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