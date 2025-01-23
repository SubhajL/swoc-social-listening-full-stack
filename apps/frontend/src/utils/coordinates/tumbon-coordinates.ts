import { AdministrativeRegionCoordinates } from '../administrative-regions';

export interface TumbonData extends AdministrativeRegionCoordinates {
  province: string;
  amphure: string;
}

export interface TumbonCoordinateMap {
  [province: string]: {
    [amphure: string]: {
      [tumbon: string]: AdministrativeRegionCoordinates;
    };
  };
}

export const tumbonCoordinates: TumbonCoordinateMap = {
  'กรุงเทพมหานคร': {
    'พระนคร': {
      'พระบรมมหาราชวัง': { latitude: 13.7516, longitude: 100.4916 },
      'วังบูรพาภิรมย์': { latitude: 13.7445, longitude: 100.5007 },
      'วัดราชบพิธ': { latitude: 13.7485, longitude: 100.4982 },
      'สำราญราษฎร์': { latitude: 13.7467, longitude: 100.5043 },
      'ศาลเจ้าพ่อเสือ': { latitude: 13.7429, longitude: 100.5007 },
      'เสาชิงช้า': { latitude: 13.7516, longitude: 100.4982 },
      'บวรนิเวศ': { latitude: 13.7554, longitude: 100.5007 },
      'ตลาดยอด': { latitude: 13.7592, longitude: 100.5007 }
    },
    'ดุสิต': {
      'ดุสิต': { latitude: 13.7741, longitude: 100.5157 },
      'วชิรพยาบาล': { latitude: 13.7779, longitude: 100.5157 },
      'สวนจิตรลดา': { latitude: 13.7817, longitude: 100.5157 },
      'สี่แยกมหานาค': { latitude: 13.7855, longitude: 100.5157 }
    },
    'บางกะปิ': {
      'คลองจั่น': { latitude: 13.7649, longitude: 100.6428 },
      'หัวหมาก': { latitude: 13.7565, longitude: 100.6344 },
      'นวลจันทร์': { latitude: 13.7700, longitude: 100.6450 },
      'ลาดพร้าว': { latitude: 13.7680, longitude: 100.6400 }
    },
    'ปทุมวัน': {
      'รองเมือง': { latitude: 13.7467, longitude: 100.5327 },
      'วังใหม่': { latitude: 13.7383, longitude: 100.5243 },
      'ปทุมวัน': { latitude: 13.7451, longitude: 100.5311 },
      'ลุมพินี': { latitude: 13.7335, longitude: 100.5419 },
      'มักกะสัน': { latitude: 13.7500, longitude: 100.5400 }
    },
    'ป้อมปราบศัตรูพ่าย': {
      'ป้อมปราบ': { latitude: 13.7449, longitude: 100.5087 },
      'วัดเทพศิรินทร์': { latitude: 13.7465, longitude: 100.5103 },
      'คลองมหานาค': { latitude: 13.7433, longitude: 100.5071 },
      'บ้านบาตร': { latitude: 13.7481, longitude: 100.5119 },
      'วัดโสมนัส': { latitude: 13.7470, longitude: 100.5100 }
    },
    'พระโขนง': {
      'บางจาก': { latitude: 13.7049, longitude: 100.6094 },
      'พระโขนงใต้': { latitude: 13.7020, longitude: 100.6050 },
      'พระโขนงเหนือ': { latitude: 13.7080, longitude: 100.6080 }
    },
    'มีนบุรี': {
      'มีนบุรี': { latitude: 13.8149, longitude: 100.7319 },
      'แสนแสบ': { latitude: 13.8065, longitude: 100.7235 },
      'บางชัน': { latitude: 13.8200, longitude: 100.7300 },
      'สามวาตะวันออก': { latitude: 13.8100, longitude: 100.7400 }
    },
    'ลาดกระบัง': {
      'ลาดกระบัง': { latitude: 13.7272, longitude: 100.7852 },
      'คลองสองต้นนุ่น': { latitude: 13.7388, longitude: 100.7968 },
      'คลองสามประเวศ': { latitude: 13.7156, longitude: 100.7736 },
      'ทับยาว': { latitude: 13.7300, longitude: 100.7900 },
      'ขุมทอง': { latitude: 13.7250, longitude: 100.7800 },
      'ลำปลาทิว': { latitude: 13.7350, longitude: 100.7850 }
    },
    'ยานนาวา': {
      'ช่องนนทรี': { latitude: 13.7020, longitude: 100.5450 },
      'บางโพงพาง': { latitude: 13.6950, longitude: 100.5400 },
      'ทุ่งมหาเมฆ': { latitude: 13.7050, longitude: 100.5430 },
      'ทุ่งวัดดอน': { latitude: 13.7000, longitude: 100.5420 }
    },
    'สัมพันธวงศ์': {
      'จักรวรรดิ': { latitude: 13.7372, longitude: 100.5087 },
      'สัมพันธวงศ์': { latitude: 13.7392, longitude: 100.5067 },
      'ตลาดน้อย': { latitude: 13.7352, longitude: 100.5107 },
      'เจริญกรุง': { latitude: 13.7382, longitude: 100.5097 },
      'ตลาดเก่า': { latitude: 13.7362, longitude: 100.5077 }
    },
    'บางนา': {
      'บางนา': { latitude: 13.6670, longitude: 100.6040 },
      'บางนาเหนือ': { latitude: 13.6650, longitude: 100.6060 },
      'บางนาใต้': { latitude: 13.6690, longitude: 100.6020 }
    },
    'ทวีวัฒนา': {
      'ทวีวัฒนา': { latitude: 13.7780, longitude: 100.3550 },
      'ศาลาธรรมสพน์': { latitude: 13.7760, longitude: 100.3570 }
    },
    'ทุ่งครุ': {
      'ทุ่งครุ': { latitude: 13.6520, longitude: 100.5080 },
      'บางมด': { latitude: 13.6500, longitude: 100.5100 }
    },
    'บางบอน': {
      'บางบอน': { latitude: 13.6800, longitude: 100.3700 },
      'บางบอนเหนือ': { latitude: 13.6820, longitude: 100.3680 },
      'บางบอนใต้': { latitude: 13.6780, longitude: 100.3720 }
    },
    'คลองเตย': {
      'คลองเตย': { latitude: 13.7100, longitude: 100.5800 },
      'คลองตัน': { latitude: 13.7120, longitude: 100.5780 },
      'พระโขนง': { latitude: 13.7080, longitude: 100.5820 }
    },
    'ประเวศ': {
      'ประเวศ': { latitude: 13.7000, longitude: 100.6700 },
      'หนองบอน': { latitude: 13.7020, longitude: 100.6680 },
      'ดอกไม้': { latitude: 13.6980, longitude: 100.6720 }
    },
    'พญาไท': {
      'สามเสนใน': { latitude: 13.7819, longitude: 100.5350 },
      'พญาไท': { latitude: 13.7789, longitude: 100.5370 },
      'อนุสาวรีย์': { latitude: 13.7839, longitude: 100.5330 },
      'ทุ่งพญาไท': { latitude: 13.7809, longitude: 100.5360 }
    },
    'ธนบุรี': {
      'วัดกัลยาณ์': { latitude: 13.7199, longitude: 100.4850 },
      'หิรัญรูจี': { latitude: 13.7179, longitude: 100.4870 },
      'บางยี่เรือ': { latitude: 13.7219, longitude: 100.4830 },
      'บุคคโล': { latitude: 13.7159, longitude: 100.4890 },
      'ตลาดพลู': { latitude: 13.7139, longitude: 100.4910 },
      'ดาวคะนอง': { latitude: 13.7119, longitude: 100.4930 },
      'สำเหร่': { latitude: 13.7179, longitude: 100.4890 }
    }
  },
  'นนทบุรี': {
    'เมืองนนทบุรี': {
      'สวนใหญ่': { latitude: 13.8622, longitude: 100.5142 },
      'ตลาดขวัญ': { latitude: 13.8600, longitude: 100.5120 },
      'บางเขน': { latitude: 13.8580, longitude: 100.5160 },
      'บางกระสอ': { latitude: 13.8560, longitude: 100.5180 }
    },
    'บางกรวย': {
      'วัดชลอ': { latitude: 13.8055, longitude: 100.4582 },
      'บางกรวย': { latitude: 13.8030, longitude: 100.4560 },
      'บางสีทอง': { latitude: 13.8080, longitude: 100.4600 }
    },
    'บางใหญ่': {
      'บางใหญ่': { latitude: 13.8389, longitude: 100.4139 },
      'บางม่วง': { latitude: 13.8450, longitude: 100.4100 },
      'บางเลน': { latitude: 13.8330, longitude: 100.4180 },
      'เสาธงหิน': { latitude: 13.8500, longitude: 100.4080 },
      'บ้านใหม่': { latitude: 13.8280, longitude: 100.4220 }
    },
    'บางบัวทอง': {
      'โสนลอย': { latitude: 13.9500, longitude: 100.4167 },
      'บางบัวทอง': { latitude: 13.9550, longitude: 100.4130 },
      'บางรักใหญ่': { latitude: 13.9450, longitude: 100.4200 },
      'บางคูรัด': { latitude: 13.9600, longitude: 100.4100 },
      'ละหาร': { latitude: 13.9400, longitude: 100.4230 }
    },
    'ไทรน้อย': {
      'ไทรน้อย': { latitude: 14.0167, longitude: 100.3167 },
      'ราษฎร์นิยม': { latitude: 14.0220, longitude: 100.3130 }
    }
  },
  'ปทุมธานี': {
    'คลองหลวง': {
      'คลองหนึ่ง': { latitude: 14.0697, longitude: 100.6419 },
      'คลองสอง': { latitude: 14.0750, longitude: 100.6380 },
      'คลองสาม': { latitude: 14.0640, longitude: 100.6460 },
      'คลองสี่': { latitude: 14.0800, longitude: 100.6340 },
      'คลองห้า': { latitude: 14.0590, longitude: 100.6500 },
      'คลองหก': { latitude: 14.0850, longitude: 100.6300 }
    },
    'ธัญบุรี': {
      'ประชาธิปัตย์': { latitude: 13.9919, longitude: 100.6519 },
      'รังสิต': { latitude: 13.9970, longitude: 100.6480 },
      'ธัญบุรี': { latitude: 13.9870, longitude: 100.6560 },
      'บึงน้ำรักษ์': { latitude: 14.0020, longitude: 100.6440 },
      'บึงสนั่น': { latitude: 13.9820, longitude: 100.6600 }
    },
    'ลาดหลุมแก้ว': {
      'ระแหง': { latitude: 14.0425, longitude: 100.4181 },
      'คูบางหลวง': { latitude: 14.0480, longitude: 100.4130 },
      'คูขวาง': { latitude: 14.0370, longitude: 100.4230 },
      'บ่อเงิน': { latitude: 14.0530, longitude: 100.4080 },
      'หน้าไม้': { latitude: 14.0320, longitude: 100.4280 }
    },
    'ลำลูกกา': {
      'ลำลูกกา': { latitude: 13.9494, longitude: 100.7439 },
      'บึงคำพร้อย': { latitude: 13.9550, longitude: 100.7390 },
      'ลำไทร': { latitude: 13.9440, longitude: 100.7490 },
      'บึงทองหลาง': { latitude: 13.9600, longitude: 100.7340 },
      'ลำขาม': { latitude: 13.9390, longitude: 100.7540 }
    }
  },
  'สมุทรปราการ': {
    'เมืองสมุทรปราการ': {
      'ปากน้ำ': { latitude: 13.5989, longitude: 100.5998 },
      'สำโรงเหนือ': { latitude: 13.6050, longitude: 100.5950 },
      'บางเมือง': { latitude: 13.5930, longitude: 100.6050 }
    },
    'พระประแดง': {
      'ทรงคนอง': { latitude: 13.6630, longitude: 100.5350 },
      'บางครุ': { latitude: 13.6480, longitude: 100.5500 },
      'บางหญ้าแพรก': { latitude: 13.6680, longitude: 100.5300 },
      'บางยอ': { latitude: 13.6550, longitude: 100.5420 },
      'บางน้ำผึ้ง': { latitude: 13.6600, longitude: 100.5380 }
    },
    'บางพลี': {
      'บางพลีใหญ่': { latitude: 13.6205, longitude: 100.7299 },
      'บางแก้ว': { latitude: 13.6250, longitude: 100.7250 },
      'บางปลา': { latitude: 13.6160, longitude: 100.7350 },
      'บางโฉลง': { latitude: 13.6300, longitude: 100.7200 },
      'ราชาเทวะ': { latitude: 13.6110, longitude: 100.7400 },
      'หนองปรือ': { latitude: 13.6280, longitude: 100.7220 }
    },
    'พระสมุทรเจดีย์': {
      'นาเกลือ': { latitude: 13.6019, longitude: 100.5377 },
      'บ้านคลองสวน': { latitude: 13.5970, longitude: 100.5420 },
      'แหลมฟ้าผ่า': { latitude: 13.6070, longitude: 100.5330 },
      'ในคลองบางปลากด': { latitude: 13.5920, longitude: 100.5470 },
      'ปากคลองบางปลากด': { latitude: 13.5950, longitude: 100.5400 }
    }
  },
  'นครปฐม': {
    'เมืองนครปฐม': {
      'พระปฐมเจดีย์': { latitude: 13.8196, longitude: 100.0583 },
      'บางแขม': { latitude: 13.8150, longitude: 100.0630 },
      'พระประโทน': { latitude: 13.8240, longitude: 100.0530 },
      'ธรรมศาลา': { latitude: 13.8100, longitude: 100.0680 },
      'ตาก้อง': { latitude: 13.8290, longitude: 100.0480 }
    },
    'กำแพงแสน': {
      'กำแพงแสน': { latitude: 14.0111, longitude: 99.9833 },
      'ทุ่งกระพังโหม': { latitude: 14.0160, longitude: 99.9790 },
      'ทุ่งขวาง': { latitude: 13.9770, longitude: 100.0180 },
      'สระสี่มุม': { latitude: 14.0210, longitude: 99.9740 },
      'ทุ่งบัว': { latitude: 13.9720, longitude: 100.0230 }
    },
    'ดอนตูม': {
      'สามง่าม': { latitude: 14.0333, longitude: 100.0833 },
      'ดอนพุทรา': { latitude: 14.0380, longitude: 100.0780 },
      'ดอนรวก': { latitude: 14.0290, longitude: 100.0890 },
      'ห้วยด้วน': { latitude: 14.0430, longitude: 100.0730 },
      'ลำเหย': { latitude: 14.0240, longitude: 100.0940 },
      'ห้วยพระ': { latitude: 14.0480, longitude: 100.0680 },
      'บ้านหลวง': { latitude: 14.0190, longitude: 100.0990 },
      'ดอนตูม': { latitude: 14.0530, longitude: 100.0630 }
    },
    'พุทธมณฑล': {
      'ศาลายา': { latitude: 13.8167, longitude: 100.3167 },
      'คลองโยง': { latitude: 13.8110, longitude: 100.3210 }
    }
  },
  'พระนครศรีอยุธยา': {
    'พระนครศรีอยุธยา': {
      'ประตูชัย': { latitude: 14.3692, longitude: 100.5876 },
      'กะมัง': { latitude: 14.3740, longitude: 100.5830 },
      'หอรัตนไชย': { latitude: 14.3650, longitude: 100.5920 },
      'หัวรอ': { latitude: 14.3790, longitude: 100.5780 },
      'ท่าวาสุกรี': { latitude: 14.3600, longitude: 100.5970 },
      'ไผ่ลิง': { latitude: 14.3840, longitude: 100.5730 }
    },
    'บางปะอิน': {
      'บ้านเลน': { latitude: 14.2289, longitude: 100.5781 },
      'บางกระสั้น': { latitude: 14.2340, longitude: 100.5730 },
      'บ้านหว้า': { latitude: 14.2240, longitude: 100.5830 },
      'บ้านพลับ': { latitude: 14.2390, longitude: 100.5680 },
      'บางประแดง': { latitude: 14.2190, longitude: 100.5880 }
    },
    'บางไทร': {
      'บางไทร': { latitude: 14.1953, longitude: 100.4772 },
      'บางพลี': { latitude: 14.2000, longitude: 100.4720 },
      'บ้านม้า': { latitude: 14.1900, longitude: 100.4820 },
      'บ้านแป้ง': { latitude: 14.2050, longitude: 100.4670 },
      'ห่อหมก': { latitude: 14.1850, longitude: 100.4870 }
    },
    'บางบาล': {
      'บางบาล': { latitude: 14.3833, longitude: 100.4833 },
      'วัดยม': { latitude: 14.3880, longitude: 100.4780 },
      'ไทรน้อย': { latitude: 14.3780, longitude: 100.4880 },
      'กบเจา': { latitude: 14.3930, longitude: 100.4730 },
      'มหาพราหมณ์': { latitude: 14.3730, longitude: 100.4930 }
    },
    'บางปะหัน': {
      'บางปะหัน': { latitude: 14.4667, longitude: 100.5333 },
      'ขยาย': { latitude: 14.4720, longitude: 100.5280 },
      'บ้านลี่': { latitude: 14.4610, longitude: 100.5380 },
      'ตานิม': { latitude: 14.4770, longitude: 100.5230 },
      'พุทเลา': { latitude: 14.4560, longitude: 100.5430 }
    }
  },
  'สมุทรสงคราม': {
    'เมืองสมุทรสงคราม': {
      'แม่กลอง': { latitude: 13.4125, longitude: 100.0017 },
      'บางขันแตก': { latitude: 13.4080, longitude: 100.0060 },
      'ลาดใหญ่': { latitude: 13.4170, longitude: 99.9970 },
      'บ้านปรก': { latitude: 13.4030, longitude: 100.0110 },
      'บางแก้ว': { latitude: 13.4220, longitude: 99.9920 },
      'ท้ายหาด': { latitude: 13.3980, longitude: 100.0160 },
      'แหลมใหญ่': { latitude: 13.4150, longitude: 99.9990 },
      'คลองเขิน': { latitude: 13.4100, longitude: 100.0040 },
      'คลองโคน': { latitude: 13.3930, longitude: 100.0210 },
      'นางตะเคียน': { latitude: 13.4270, longitude: 99.9870 },
      'บางจะเกร็ง': { latitude: 13.4050, longitude: 100.0090 }
    },
    'บางคนที': {
      'กระดังงา': { latitude: 13.4458, longitude: 99.9567 },
      'บางสะแก': { latitude: 13.4510, longitude: 99.9520 },
      'บางยี่รงค์': { latitude: 13.4400, longitude: 99.9610 },
      'โรงหีบ': { latitude: 13.4560, longitude: 99.9470 },
      'ดอนมะโนรา': { latitude: 13.4350, longitude: 99.9660 }
    }
  }
};

export function getTumbonCoordinates(
  province: string,
  amphure: string,
  tumbon: string
): AdministrativeRegionCoordinates | null {
  try {
    const coordinates = tumbonCoordinates[province]?.[amphure]?.[tumbon];
    if (!coordinates) {
      console.warn(`No coordinates found for tumbon: ${tumbon} in amphure: ${amphure}, province: ${province}`);
      return null;
    }
    return coordinates;
  } catch (error) {
    console.error('Error getting tumbon coordinates:', error);
    return null;
  }
}

export function validateTumbonCoordinates(coordinates: AdministrativeRegionCoordinates): boolean {
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