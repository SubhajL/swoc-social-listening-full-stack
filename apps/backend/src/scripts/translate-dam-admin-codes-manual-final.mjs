import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to CSV file and output file
const CSV_FILE_PATH = path.resolve(__dirname, '../../../../!DAMInfo_201911271750.csv');
const OUTPUT_PATH = path.resolve(__dirname, '../../../../dam_info_with_admin_locations_complete.json');

// Manual mapping of province codes to province names
// These are based on standard Thailand province codes (first 2 digits)
const PROVINCE_MAPPING = {
  '10': 'กรุงเทพมหานคร',
  '11': 'สมุทรปราการ',
  '12': 'นนทบุรี',
  '13': 'ปทุมธานี',
  '14': 'พระนครศรีอยุธยา',
  '15': 'อ่างทอง',
  '16': 'ลพบุรี',
  '17': 'สิงห์บุรี',
  '18': 'ชัยนาท',
  '19': 'สระบุรี',
  '20': 'ชลบุรี',
  '21': 'ระยอง',
  '22': 'จันทบุรี',
  '23': 'ตราด',
  '24': 'ฉะเชิงเทรา',
  '25': 'ปราจีนบุรี',
  '26': 'นครนายก',
  '27': 'สระแก้ว',
  '30': 'นครราชสีมา',
  '31': 'บุรีรัมย์',
  '32': 'สุรินทร์',
  '33': 'ศรีสะเกษ',
  '34': 'อุบลราชธานี',
  '35': 'ยโสธร',
  '36': 'ชัยภูมิ',
  '37': 'อำนาจเจริญ',
  '38': 'บึงกาฬ',
  '39': 'หนองบัวลำภู',
  '40': 'ขอนแก่น',
  '41': 'อุดรธานี',
  '42': 'เลย',
  '43': 'หนองคาย',
  '44': 'มหาสารคาม',
  '45': 'ร้อยเอ็ด',
  '46': 'กาฬสินธุ์',
  '47': 'สกลนคร',
  '48': 'นครพนม',
  '49': 'มุกดาหาร',
  '50': 'เชียงใหม่',
  '51': 'ลำพูน',
  '52': 'ลำปาง',
  '53': 'อุตรดิตถ์',
  '54': 'แพร่',
  '55': 'น่าน',
  '56': 'พะเยา',
  '57': 'เชียงราย',
  '58': 'แม่ฮ่องสอน',
  '60': 'นครสวรรค์',
  '61': 'อุทัยธานี',
  '62': 'กำแพงเพชร',
  '63': 'ตาก',
  '64': 'สุโขทัย',
  '65': 'พิษณุโลก',
  '66': 'พิจิตร',
  '67': 'เพชรบูรณ์',
  '70': 'ราชบุรี',
  '71': 'กาญจนบุรี',
  '72': 'สุพรรณบุรี',
  '73': 'นครปฐม',
  '74': 'สมุทรสาคร',
  '75': 'สมุทรสงคราม',
  '76': 'เพชรบุรี',
  '77': 'ประจวบคีรีขันธ์',
  '80': 'นครศรีธรรมราช',
  '81': 'กระบี่',
  '82': 'พังงา',
  '83': 'ภูเก็ต',
  '84': 'สุราษฎร์ธานี',
  '85': 'ระนอง',
  '86': 'ชุมพร',
  '90': 'สงขลา',
  '91': 'สตูล',
  '92': 'ตรัง',
  '93': 'พัทลุง',
  '94': 'ปัตตานี',
  '95': 'ยะลา',
  '96': 'นราธิวาส'
};

// Map of dam basin IDs to basin names
const BASIN_MAPPING = {
  '1': 'ลุ่มน้ำสาละวิน',
  '2': 'ลุ่มน้ำโขง',
  '3': 'ลุ่มน้ำกก',
  '4': 'ลุ่มน้ำชี',
  '5': 'ลุ่มน้ำมูล',
  '6': 'ลุ่มน้ำปิง',
  '7': 'ลุ่มน้ำวัง',
  '8': 'ลุ่มน้ำยม',
  '9': 'ลุ่มน้ำน่าน',
  '10': 'ลุ่มน้ำเจ้าพระยา',
  '11': 'ลุ่มน้ำสะแกกรัง',
  '12': 'ลุ่มน้ำป่าสัก',
  '13': 'ลุ่มน้ำท่าจีน',
  '14': 'ลุ่มน้ำแม่กลอง',
  '15': 'ลุ่มน้ำปราจีนบุรี',
  '16': 'ลุ่มน้ำบางปะกง',
  '17': 'ลุ่มน้ำโตนเลสาบ',
  '18': 'ลุ่มน้ำชายฝั่งทะเลตะวันออก',
  '19': 'ลุ่มน้ำเพชรบุรี',
  '20': 'ลุ่มน้ำชายฝั่งทะเลตะวันตก',
  '21': 'ลุ่มน้ำภาคใต้ฝั่งตะวันออก',
  '22': 'ลุ่มน้ำตาปี',
  '23': 'ลุ่มน้ำทะเลสาบสงขลา',
  '24': 'ลุ่มน้ำปัตตานี',
  '25': 'ลุ่มน้ำภาคใต้ฝั่งตะวันตก'
};

// Fetch administrative data from API for amphures and tambons
async function fetchAdminData() {
  try {
    console.log('Fetching administrative data from API...');
    
    // Try to read from cache first
    const cacheFile = path.resolve(__dirname, '../../../../admin_data_cache.json');
    if (fs.existsSync(cacheFile)) {
      console.log('Using cached administrative data');
      const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return cachedData;
    }
    
    // API URLs
    const provinceUrl = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province.json';
    const amphureUrl = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_amphure.json';
    const tambonUrl = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_tambon.json';
    
    // Fetch data
    const [provinceResponse, amphureResponse, tambonResponse] = await Promise.all([
      fetch(provinceUrl),
      fetch(amphureUrl),
      fetch(tambonUrl)
    ]);
    
    const provinces = await provinceResponse.json();
    const amphures = await amphureResponse.json();
    const tambons = await tambonResponse.json();
    
    // Create mappings
    const amphureById = {};
    amphures.forEach(amphure => {
      amphureById[amphure.id] = amphure;
    });
    
    const tambonById = {};
    tambons.forEach(tambon => {
      tambonById[tambon.id] = tambon;
    });
    
    // Create mapping from code to name
    const amphureByCode = {};
    const tambonByCode = {};
    
    // Process amphures
    amphures.forEach(amphure => {
      // Add leading zeros to make it 4 digits
      const amphureId = String(amphure.id).padStart(4, '0');
      // Combine with province ID to form a code
      const provinceId = String(amphure.province_id).padStart(2, '0');
      const fullCode = `${provinceId}${amphureId}00`;
      
      amphureByCode[fullCode] = amphure.name_th;
    });
    
    // Process tambons
    tambons.forEach(tambon => {
      // Add leading zeros
      const tambonId = String(tambon.id).padStart(6, '0');
      // Get province ID from amphure
      const amphure = amphureById[tambon.amphure_id];
      if (amphure) {
        const provinceId = String(amphure.province_id).padStart(2, '0');
        const fullCode = `${provinceId}${tambonId}`;
        
        tambonByCode[fullCode] = tambon.name_th;
      }
    });
    
    const adminData = {
      amphureByCode,
      tambonByCode
    };
    
    // Cache the data
    fs.writeFileSync(cacheFile, JSON.stringify(adminData, null, 2));
    
    console.log(`Successfully fetched administrative data: ${Object.keys(amphureByCode).length} amphures, ${Object.keys(tambonByCode).length} tambons`);
    return adminData;
  } catch (error) {
    console.error(`Error fetching administrative data: ${error.message}`);
    return { amphureByCode: {}, tambonByCode: {} };
  }
}

function getProvinceNameFromCode(code) {
  if (!code) return 'Unknown';
  
  // Get the first 2 digits of the province code
  const provinceCode = code.substring(0, 2);
  return PROVINCE_MAPPING[provinceCode] || 'Unknown';
}

function getAmphureNameFromCode(code, adminData) {
  if (!code || !adminData) return 'Unknown';
  
  // Try direct lookup first
  if (adminData.amphureByCode[code]) {
    return adminData.amphureByCode[code];
  }
  
  // Try truncated variations - different code formats
  const variations = [
    code.substring(0, 4) + '0000',  // First 4 digits + zeros
    code.substring(0, 6) + '00',    // First 6 digits + zeros
    code.substring(0, 4),           // Just first 4 digits
    code.substring(0, 6)            // Just first 6 digits
  ];
  
  for (const variant of variations) {
    if (adminData.amphureByCode[variant]) {
      return adminData.amphureByCode[variant];
    }
  }
  
  return 'Unknown';
}

function getTambonNameFromCode(code, adminData) {
  if (!code || !adminData) return 'Unknown';
  
  // Try direct lookup first
  if (adminData.tambonByCode[code]) {
    return adminData.tambonByCode[code];
  }
  
  // Try truncated variations - different code formats
  const variations = [
    code.substring(0, 6) + '00',    // First 6 digits + zeros
    code.substring(0, 6),           // Just first 6 digits
    code.substring(0, 8)            // First 8 digits
  ];
  
  for (const variant of variations) {
    if (adminData.tambonByCode[variant]) {
      return adminData.tambonByCode[variant];
    }
  }
  
  return 'Unknown';
}

function getBasinNameFromId(id) {
  if (!id) return 'Unknown';
  return BASIN_MAPPING[id] || 'Unknown';
}

async function translateDamAdminCodes() {
  try {
    console.log(`Reading CSV file from: ${CSV_FILE_PATH}`);
    
    // Fetch admin data for amphures and tambons
    const adminData = await fetchAdminData();
    
    // Read the CSV file
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    
    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Find indices of code columns
    const provinceCodeIndex = headers.indexOf('provincecode');
    const amphurCodeIndex = headers.indexOf('ampurcode');
    const tambonCodeIndex = headers.indexOf('tamboncode');
    const basinIdIndex = headers.indexOf('basinid');
    
    if (provinceCodeIndex === -1 || amphurCodeIndex === -1 || tambonCodeIndex === -1) {
      console.warn('Warning: Some code columns are missing from the CSV.');
    }
    
    // Parse records
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',');
      
      // Skip lines that don't have enough values
      if (values.length !== headers.length) {
        console.log(`Skipping line ${i + 1} due to column count mismatch`);
        continue;
      }
      
      // Create record object
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim() : '';
      });
      
      // Add location names using our mapping
      const provinceCode = record.provincecode;
      if (provinceCode) {
        record.provinceName = getProvinceNameFromCode(provinceCode);
      }
      
      // Add amphure name
      const amphureCode = record.ampurcode;
      if (amphureCode) {
        record.amphureName = getAmphureNameFromCode(amphureCode, adminData);
      }
      
      // Add tambon name
      const tambonCode = record.tamboncode;
      if (tambonCode) {
        record.tambonName = getTambonNameFromCode(tambonCode, adminData);
      }
      
      // Add basin name if basin ID is present
      const basinId = record.basinid;
      if (basinId) {
        record.basinName = getBasinNameFromId(basinId);
      }
      
      records.push(record);
    }
    
    console.log(`Successfully parsed ${records.length} records from CSV`);
    
    // Filter out rows with empty DAM_ID or DAM_Name
    const validRecords = records.filter(record => {
      return record.DAM_ID && record.DAM_Name;
    });
    
    console.log(`Found ${validRecords.length} valid dam records`);
    
    // Process each record to convert numeric values
    const processedRecords = validRecords.map(record => {
      const processedRecord = { ...record };
      
      // Convert numeric fields
      ['DAM_Lat', 'DAM_Lon', 'DAM_QMax', 'DAM_QStore', 'DAM_QUsage', 
       'DAM_ULevelMax', 'DAM_ULevelMin', 'DAM_DLevelMax', 'DAM_DLevelMin'].forEach(field => {
        if (processedRecord[field]) {
          const numValue = parseFloat(processedRecord[field]);
          if (!isNaN(numValue)) {
            processedRecord[field] = numValue;
          }
        }
      });
      
      // Convert boolean fields
      if (processedRecord.DAM_ShowReport) {
        processedRecord.DAM_ShowReport = processedRecord.DAM_ShowReport === '1';
      }
      
      return processedRecord;
    });
    
    // Organize dams by region
    const damsByRegion = {};
    processedRecords.forEach(dam => {
      const region = dam.DAM_Group || 'Unknown';
      if (!damsByRegion[region]) {
        damsByRegion[region] = [];
      }
      damsByRegion[region].push(dam);
    });
    
    // Debug output for province mapping
    console.log('\nLocation mapping results (first 5 dams):');
    for (const dam of processedRecords.slice(0, 5)) {
      console.log(`Dam: ${dam.DAM_Name}`);
      console.log(`  Province: ${dam.provinceName || 'Unknown'} (${dam.provincecode || 'No code'})`);
      console.log(`  Amphure: ${dam.amphureName || 'Unknown'} (${dam.ampurcode || 'No code'})`);
      console.log(`  Tambon: ${dam.tambonName || 'Unknown'} (${dam.tamboncode || 'No code'})`);
      console.log(`  Basin: ${dam.basinName || 'Unknown'} (${dam.basinid || 'No ID'})`);
    }
    
    // Organize dams by province
    const damsByProvince = {};
    processedRecords.forEach(dam => {
      const province = dam.provinceName || 'Unknown';
      if (!damsByProvince[province]) {
        damsByProvince[province] = [];
      }
      damsByProvince[province].push(dam);
    });
    
    // Organize dams by basin
    const damsByBasin = {};
    processedRecords.forEach(dam => {
      const basin = dam.basinName || 'Unknown';
      if (!damsByBasin[basin]) {
        damsByBasin[basin] = [];
      }
      damsByBasin[basin].push(dam);
    });
    
    // Create output structure
    const outputData = {
      metadata: {
        totalDams: processedRecords.length,
        source: '!DAMInfo_201911271750.csv',
        exportDate: new Date().toISOString(),
        regions: Object.keys(damsByRegion),
        provinces: Object.keys(damsByProvince),
        basins: Object.keys(damsByBasin),
        hasLocationNames: true
      },
      damsByRegion: damsByRegion,
      damsByProvince: damsByProvince,
      damsByBasin: damsByBasin,
      dams: processedRecords
    };
    
    // Write to JSON file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    
    console.log(`Successfully exported dam information with admin locations to: ${OUTPUT_PATH}`);
    
    // Show a sample of the data
    console.log('\nSample of exported data (first 3 records):');
    console.table(processedRecords.slice(0, 3).map(dam => ({
      DAM_ID: dam.DAM_ID,
      DAM_Name: dam.DAM_Name,
      DAM_Group: dam.DAM_Group,
      DAM_Lat: dam.DAM_Lat,
      DAM_Lon: dam.DAM_Lon,
      provinceName: dam.provinceName || 'Unknown',
      amphureName: dam.amphureName || 'Unknown',
      tambonName: dam.tambonName || 'Unknown',
      basinName: dam.basinName || 'Unknown'
    })));
    
    // Count dams by province
    console.log('\nDams count by province:');
    Object.entries(damsByProvince)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([province, dams]) => {
        console.log(`${province}: ${dams.length}`);
      });
    
    // Count dams by basin
    console.log('\nDams count by basin:');
    Object.entries(damsByBasin)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([basin, dams]) => {
        console.log(`${basin}: ${dams.length}`);
      });
    
    return processedRecords.length;
  } catch (error) {
    console.error(`Error translating dam admin codes: ${error.message}`);
    throw error;
  }
}

// Run the function
translateDamAdminCodes().then((count) => {
  console.log(`Successfully translated admin codes for ${count} dam records`);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 