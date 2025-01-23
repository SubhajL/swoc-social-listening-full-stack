import { provinceMapping } from './provinces';

export interface ProvinceCoordinates {
  latitude: number;
  longitude: number;
}

export const provinceCoordinates: { [key: string]: ProvinceCoordinates } = {
  // Central Region
  "กรุงเทพมหานคร": { latitude: 13.7563, longitude: 100.5018 },
  "นนทบุรี": { latitude: 13.8622, longitude: 100.5142 },
  "ปทุมธานี": { latitude: 14.0208, longitude: 100.5255 },
  "พระนครศรีอยุธยา": { latitude: 14.3692, longitude: 100.5876 },
  "อ่างทอง": { latitude: 14.5897, longitude: 100.4552 },
  "ลพบุรี": { latitude: 14.7995, longitude: 100.6543 },
  "สิงห์บุรี": { latitude: 14.8907, longitude: 100.3968 },
  "ชัยนาท": { latitude: 15.1851, longitude: 100.1251 },
  "สระบุรี": { latitude: 14.5289, longitude: 100.9108 },
  "นครนายก": { latitude: 14.2069, longitude: 101.2055 },
  "ปราจีนบุรี": { latitude: 14.0579, longitude: 101.3725 },
  "สระแก้ว": { latitude: 13.8244, longitude: 102.0645 },
  "ฉะเชิงเทรา": { latitude: 13.6904, longitude: 101.0779 },
  "ชลบุรี": { latitude: 13.3611, longitude: 100.9847 },
  "ระยอง": { latitude: 12.6833, longitude: 101.2372 },
  "จันทบุรี": { latitude: 12.6113, longitude: 102.1035 },
  "ตราด": { latitude: 12.2427, longitude: 102.5177 },
  "สมุทรปราการ": { latitude: 13.5990, longitude: 100.5998 },
  "สมุทรสาคร": { latitude: 13.5475, longitude: 100.2745 },
  "สมุทรสงคราม": { latitude: 13.4094, longitude: 100.0021 },
  "เพชรบุรี": { latitude: 13.1119, longitude: 99.9399 },
  "ประจวบคีรีขันธ์": { latitude: 11.8126, longitude: 99.7957 },
  "ราชบุรี": { latitude: 13.5282, longitude: 99.8133 },
  "กาญจนบุรี": { latitude: 14.0227, longitude: 99.5328 },
  "สุพรรณบุรี": { latitude: 14.4744, longitude: 100.1177 },
  "นครปฐม": { latitude: 13.8196, longitude: 100.0645 },

  // Northern Region
  "เชียงใหม่": { latitude: 18.7883, longitude: 98.9853 },
  "ลำพูน": { latitude: 18.5744, longitude: 99.0087 },
  "ลำปาง": { latitude: 18.2854, longitude: 99.5122 },
  "อุตรดิตถ์": { latitude: 17.6200, longitude: 100.0993 },
  "แพร่": { latitude: 18.1445, longitude: 100.1405 },
  "น่าน": { latitude: 18.7756, longitude: 100.7733 },
  "พะเยา": { latitude: 19.1665, longitude: 99.9003 },
  "เชียงราย": { latitude: 19.9105, longitude: 99.8406 },
  "แม่ฮ่องสอน": { latitude: 19.2990, longitude: 97.9684 },
  "นครสวรรค์": { latitude: 15.7030, longitude: 100.1367 },
  "อุทัยธานี": { latitude: 15.3838, longitude: 100.0243 },
  "กำแพงเพชร": { latitude: 16.4834, longitude: 99.5222 },
  "ตาก": { latitude: 16.8839, longitude: 99.1258 },
  "สุโขทัย": { latitude: 17.0070, longitude: 99.8265 },
  "พิษณุโลก": { latitude: 16.8298, longitude: 100.2658 },
  "พิจิตร": { latitude: 16.4429, longitude: 100.3487 },
  "เพชรบูรณ์": { latitude: 16.4189, longitude: 101.1591 },

  // Northeastern Region
  "นครราชสีมา": { latitude: 14.9798, longitude: 102.0978 },
  "บุรีรัมย์": { latitude: 14.9930, longitude: 103.1029 },
  "สุรินทร์": { latitude: 14.8828, longitude: 103.4944 },
  "ศรีสะเกษ": { latitude: 15.1186, longitude: 104.3216 },
  "อุบลราชธานี": { latitude: 15.2286, longitude: 104.8566 },
  "ยโสธร": { latitude: 15.7924, longitude: 104.1451 },
  "ชัยภูมิ": { latitude: 15.8068, longitude: 102.0317 },
  "อำนาจเจริญ": { latitude: 15.8656, longitude: 104.6476 },
  "หนองบัวลำภู": { latitude: 17.2216, longitude: 102.4260 },
  "ขอนแก่น": { latitude: 16.4419, longitude: 102.8360 },
  "อุดรธานี": { latitude: 17.4156, longitude: 102.7872 },
  "เลย": { latitude: 17.4860, longitude: 101.7223 },
  "หนองคาย": { latitude: 17.8783, longitude: 102.7416 },
  "มหาสารคาม": { latitude: 16.1852, longitude: 103.3027 },
  "ร้อยเอ็ด": { latitude: 16.0538, longitude: 103.6520 },
  "กาฬสินธุ์": { latitude: 16.4314, longitude: 103.5058 },
  "สกลนคร": { latitude: 17.1545, longitude: 104.1348 },
  "นครพนม": { latitude: 17.4043, longitude: 104.7690 },
  "มุกดาหาร": { latitude: 16.5420, longitude: 104.7227 },
  "บึงกาฬ": { latitude: 18.3609, longitude: 103.6466 },

  // Southern Region
  "นครศรีธรรมราช": { latitude: 8.4304, longitude: 99.9633 },
  "กระบี่": { latitude: 8.0862, longitude: 98.9063 },
  "พังงา": { latitude: 8.4509, longitude: 98.5194 },
  "ภูเก็ต": { latitude: 7.8804, longitude: 98.3923 },
  "สุราษฎร์ธานี": { latitude: 9.1382, longitude: 99.3217 },
  "ระนอง": { latitude: 9.9528, longitude: 98.6085 },
  "ชุมพร": { latitude: 10.4930, longitude: 99.1800 },
  "สงขลา": { latitude: 7.1896, longitude: 100.5945 },
  "สตูล": { latitude: 6.6238, longitude: 100.0675 },
  "ตรัง": { latitude: 7.5593, longitude: 99.6114 },
  "พัทลุง": { latitude: 7.6166, longitude: 100.0742 },
  "ปัตตานี": { latitude: 6.8692, longitude: 101.2550 },
  "ยะลา": { latitude: 6.5413, longitude: 101.2803 },
  "นราธิวาส": { latitude: 6.4250, longitude: 101.8234 }
};

export const getProvinceCoordinates = (provinceName: string): ProvinceCoordinates | null => {
  if (!provinceName) {
    console.warn('Province name is required');
    return null;
  }

  const coordinates = provinceCoordinates[provinceName];
  if (!coordinates) {
    console.warn(`No coordinates found for province: ${provinceName}`);
    return null;
  }

  return coordinates;
};

export const DEFAULT_COORDINATES: ProvinceCoordinates = {
  latitude: 13.7563,  // Bangkok
  longitude: 100.5018
};

// Placeholder functions for future implementation
export const getTumbonCoordinates = (tumbon: string): ProvinceCoordinates => {
  console.warn('Tumbon coordinates not implemented yet, using default');
  return DEFAULT_COORDINATES;
};

export const getAmphureCoordinates = (amphure: string): ProvinceCoordinates => {
  console.warn('Amphure coordinates not implemented yet, using default');
  return DEFAULT_COORDINATES;
}; 