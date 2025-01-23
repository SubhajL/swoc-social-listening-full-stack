import { AdministrativeRegionCoordinates } from '../administrative-regions';

export interface AmphureData extends AdministrativeRegionCoordinates {
  province: string;
}

export interface AmphureCoordinateMap {
  [province: string]: {
    [amphure: string]: AdministrativeRegionCoordinates;
  };
}

export const amphureCoordinates: AmphureCoordinateMap = {
  'กรุงเทพมหานคร': {
    'พระนคร': { latitude: 13.7520, longitude: 100.4940 },
    'ดุสิต': { latitude: 13.7741, longitude: 100.5157 },
    'หนองจอก': { latitude: 13.8556, longitude: 100.8772 },
    'บางรัก': { latitude: 13.7246, longitude: 100.5331 },
    'บางเขน': { latitude: 13.8900, longitude: 100.5700 },
    'บางกะปิ': { latitude: 13.7649, longitude: 100.6428 },
    'ปทุมวัน': { latitude: 13.7467, longitude: 100.5327 },
    'ป้อมปราบศัตรูพ่าย': { latitude: 13.7449, longitude: 100.5087 },
    'พระโขนง': { latitude: 13.7049, longitude: 100.6094 },
    'มีนบุรี': { latitude: 13.8149, longitude: 100.7319 },
    'ลาดกระบัง': { latitude: 13.7272, longitude: 100.7852 },
    'ยานนาวา': { latitude: 13.7020, longitude: 100.5450 },
    'สัมพันธวงศ์': { latitude: 13.7372, longitude: 100.5087 },
    'หนองแขม': { latitude: 13.7100, longitude: 100.3500 },
    'ราษฎร์บูรณะ': { latitude: 13.6800, longitude: 100.5000 },
    'บางพลัด': { latitude: 13.7900, longitude: 100.4800 },
    'ดินแดง': { latitude: 13.7700, longitude: 100.5500 },
    'บึงกุ่ม': { latitude: 13.8000, longitude: 100.6400 },
    'สาทร': { latitude: 13.7200, longitude: 100.5300 },
    'บางซื่อ': { latitude: 13.8200, longitude: 100.5300 },
    'จตุจักร': { latitude: 13.8300, longitude: 100.5500 },
    'สายไหม': { latitude: 13.9200, longitude: 100.6500 },
    'คันนายาว': { latitude: 13.8400, longitude: 100.6700 },
    'สะพานสูง': { latitude: 13.7600, longitude: 100.6900 },
    'วังทองหลาง': { latitude: 13.7800, longitude: 100.6000 },
    'คลองสามวา': { latitude: 13.8700, longitude: 100.7500 },
    'บางนา': { latitude: 13.6700, longitude: 100.6000 },
    'ทวีวัฒนา': { latitude: 13.7800, longitude: 100.3500 },
    'ทุ่งครุ': { latitude: 13.6500, longitude: 100.5000 },
    'บางบอน': { latitude: 13.6800, longitude: 100.3700 },
    'คลองเตย': { latitude: 13.7100, longitude: 100.5800 },
    'ประเวศ': { latitude: 13.7000, longitude: 100.6700 },
    'พญาไท': { latitude: 13.7819, longitude: 100.5350 },
    'ธนบุรี': { latitude: 13.7199, longitude: 100.4850 },
    'บางกอกใหญ่': { latitude: 13.7428, longitude: 100.4760 },
    'ห้วยขวาง': { latitude: 13.7690, longitude: 100.5780 },
    'คลองสาน': { latitude: 13.7320, longitude: 100.5040 }
  },
  'นนทบุรี': {
    'เมืองนนทบุรี': { latitude: 13.8622, longitude: 100.5142 },
    'บางกรวย': { latitude: 13.8055, longitude: 100.4582 },
    'บางใหญ่': { latitude: 13.8389, longitude: 100.4139 },
    'บางบัวทอง': { latitude: 13.9500, longitude: 100.4167 },
    'ไทรน้อย': { latitude: 14.0167, longitude: 100.3167 }
  },
  'ปทุมธานี': {
    'คลองหลวง': { latitude: 14.0697, longitude: 100.6419 },
    'ธัญบุรี': { latitude: 13.9919, longitude: 100.6519 },
    'ลาดหลุมแก้ว': { latitude: 14.0425, longitude: 100.4181 },
    'ลำลูกกา': { latitude: 13.9494, longitude: 100.7439 }
  },
  'สมุทรปราการ': {
    'เมืองสมุทรปราการ': { latitude: 13.5989, longitude: 100.5998 },
    'พระประแดง': { latitude: 13.6630, longitude: 100.5350 },
    'บางพลี': { latitude: 13.6205, longitude: 100.7299 },
    'พระสมุทรเจดีย์': { latitude: 13.6019, longitude: 100.5377 },
    'บางบ่อ': { latitude: 13.5814, longitude: 100.8389 },
    'บางเสาธง': { latitude: 13.6019, longitude: 100.8377 }
  },
  'สมุทรสงคราม': {
    'เมืองสมุทรสงคราม': { latitude: 13.4125, longitude: 100.0017 },
    'บางคนที': { latitude: 13.4458, longitude: 99.9567 }
  },
  'นครปฐม': {
    'เมืองนครปฐม': { latitude: 13.8196, longitude: 100.0583 },
    'กำแพงแสน': { latitude: 14.0111, longitude: 99.9833 },
    'ดอนตูม': { latitude: 14.0333, longitude: 100.0833 },
    'พุทธมณฑล': { latitude: 13.8167, longitude: 100.3167 }
  },
  'พระนครศรีอยุธยา': {
    'พระนครศรีอยุธยา': { latitude: 14.3692, longitude: 100.5876 },
    'บางปะอิน': { latitude: 14.2289, longitude: 100.5781 },
    'บางไทร': { latitude: 14.1953, longitude: 100.4772 },
    'บางบาล': { latitude: 14.3833, longitude: 100.4833 },
    'บางปะหัน': { latitude: 14.4667, longitude: 100.5333 }
  }
};

export function getAmphureCoordinates(
  province: string,
  amphure: string
): AdministrativeRegionCoordinates | null {
  try {
    const coordinates = amphureCoordinates[province]?.[amphure];
    if (!coordinates) {
      console.warn(`No coordinates found for amphure: ${amphure} in province: ${province}`);
      return null;
    }
    return coordinates;
  } catch (error) {
    console.error('Error getting amphure coordinates:', error);
    return null;
  }
}

export function validateAmphureCoordinates(coordinates: AdministrativeRegionCoordinates): boolean {
  if (!coordinates) return false;
  
  const { latitude, longitude } = coordinates;
  
  // Thailand's approximate bounding box
  const THAILAND_BOUNDS = {
    minLat: 5.613038,  // Southernmost point
    maxLat: 20.465143, // Northernmost point
    minLng: 97.343396, // Westernmost point
    maxLng: 105.636812 // Easternmost point
  };

  return (
    latitude >= THAILAND_BOUNDS.minLat &&
    latitude <= THAILAND_BOUNDS.maxLat &&
    longitude >= THAILAND_BOUNDS.minLng &&
    longitude <= THAILAND_BOUNDS.maxLng
  );
} 