import { shapeStyles } from '@/components/map/styles';

export enum CategoryName {
  REQUEST_SUPPORT = 'การขอการสนับสนุน/ช่วยดำเนินการ',
  REPORT_INCIDENT = 'การรายงานและแจ้งเหตุ',
  REQUEST_INFO = 'ขอข้อมูล',
  SUGGESTION = 'ข้อเสนอแนะ',
  UNKNOWN = 'Unknown'
}

export type CoordinateSource = 'direct' | 'cache_direct' | 'cache_inherited';

export interface ProcessedPost {
  processed_post_id: number;
  text: string;
  category_name: string;
  sub1_category_name: string;
  profile_name: string;
  post_date: Date;
  post_url: string;
  latitude: number;
  longitude: number;
  tumbon: string[];
  amphure: string[];
  province: string[];
  created_at: string;
  status?: string;
  coordinate_source: CoordinateSource;
}

export const categoryShapeMap: Record<CategoryName, keyof typeof shapeStyles> = {
  [CategoryName.REPORT_INCIDENT]: 'triangle',
  [CategoryName.REQUEST_SUPPORT]: 'square',
  [CategoryName.REQUEST_INFO]: 'circle',
  [CategoryName.SUGGESTION]: 'hexa',
  [CategoryName.UNKNOWN]: 'diamond'
};

export const SubCategories: Record<CategoryName, string[]> = {
  [CategoryName.REPORT_INCIDENT]: ['ทั้งหมด'],
  [CategoryName.REQUEST_SUPPORT]: ['ทั้งหมด'],
  [CategoryName.REQUEST_INFO]: ['ทั้งหมด'],
  [CategoryName.SUGGESTION]: ['ทั้งหมด'],
  [CategoryName.UNKNOWN]: ['ทั้งหมด']
};

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