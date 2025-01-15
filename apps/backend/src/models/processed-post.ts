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
  };
  status: 'unprocessed' | 'processing' | 'resolved';
  created_at: Date;
  updated_at: Date;
  nearest_sensor_id?: string;
}

export enum CategoryName {
  REQUEST_SUPPORT = 'การขอการสนับสนุน/ช่วยดำเนินการ',
  REPORT_INCIDENT = 'การรายงานและแจ้งเหตุ',
  REQUEST_INFO = 'การขอข้อมูล',
  SUGGESTION = 'ข้อเสนอแนะ'
}

export const CategoryIconMap = {
  [CategoryName.REPORT_INCIDENT]: 'circle',
  [CategoryName.REQUEST_SUPPORT]: 'triangle',
  [CategoryName.REQUEST_INFO]: 'square',
  [CategoryName.SUGGESTION]: 'hexa'
} as const; 