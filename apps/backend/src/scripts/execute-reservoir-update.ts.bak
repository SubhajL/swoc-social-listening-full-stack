import { config } from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../../.env') });

// Database configuration using write credentials
const dbConfig = {
  user: process.env.DB_WRITE_USER,
  password: process.env.DB_WRITE_PASSWORD,
  host: process.env.DB_WRITE_HOST,
  port: parseInt(process.env.DB_WRITE_PORT || '5432'),
  database: process.env.DB_WRITE_DATABASE,
  ssl: process.env.DB_WRITE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

console.log('Database config (without password):', {
  ...dbConfig,
  password: '***'
});

const pool = new Pool(dbConfig);

interface ReservoirRow {
  cresv: string;          // reservoir ID
  nresv: string;          // reservoir name in Thai
  tamboncode: string;     // tumbon code (8 digits: 2-province, 2-amphure, 2-tambon, 2-muban)
  creg: string;
  cresv_lat: string;
  cresv_lng: string;
  create_date?: string;
  update_date?: string;
  project_id: string;
  project_name: string;
  status: string;
}

interface LocationCodes {
  provinceCode: string;
  amphureCode: string;
}

async function readExcelFile(): Promise<ReservoirRow[]> {
  const excelPath = path.join(__dirname, '../../../../reservior (tumbon code).xlsx');
  logger.info('Reading Excel file from:', excelPath);
  
  const workbook = xlsx.readFile(excelPath, {
    type: 'file',
    cellDates: true,
    cellNF: false,
    cellText: false
  });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: null,
    blankrows: false
  }) as ReservoirRow[];

  if (data.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Log the first row to see the structure
  logger.info('First row from Excel:', {
    cresv: data[0].cresv,
    nresv: data[0].nresv,
    tamboncode: data[0].tamboncode
  });
  
  // Log all column names
  logger.info('Excel columns:', Object.keys(data[0]));

  logger.info(`Read ${data.length} rows from Excel file`);
  return data;
}

async function checkRequiredTables(client: pkg.PoolClient): Promise<boolean> {
  const tables = ['reservoir'];
  
  for (const table of tables) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [table]);
    
    if (!result.rows[0].exists) {
      logger.error(`Required table '${table}' does not exist`);
      return false;
    }
  }
  
  return true;
}

function normalizeReservoirName(name: string): string {
  return name
    .replace(/อ่างเก็บน้ำ/g, '')  // Remove อ่างเก็บน้ำ
    .replace(/ห้วย/g, '')        // Remove ห้วย
    .replace(/อ่างฯ/g, '')       // Remove อ่างฯ
    .replace(/\s+/g, ' ')        // Normalize spaces
    .trim();
}

function extractAmphure(name: string): string | null {
  const match = name.match(/อ\.([^,\s]+)/);
  return match ? match[1] : null;
}

async function getTableColumns(client: pkg.PoolClient): Promise<string[]> {
  const query = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'reservoir';
  `;
  
  const { rows } = await client.query(query);
  return rows.map(row => row.column_name);
}

// Add function to extract location codes
function extractLocationCodes(tambonCode: string) {
  if (!tambonCode || tambonCode.length !== 8) {
    return null;
  }
  
  return {
    provinceCode: tambonCode.substring(0, 2),
    amphureCode: tambonCode.substring(0, 4)
  };
}

// Replace the getLocationNames function with:
function getLocationNames(tambonCode: string): { provinceName: string; amphureName: string } | null {
  if (!tambonCode || tambonCode.length !== 8) {
    return null;
  }

  const provinceCode = tambonCode.substring(0, 2);
  const amphureCode = tambonCode.substring(0, 4);

  // Map province codes to Thai names
  const provinceMap: Record<string, string> = {
    "10": "กรุงเทพมหานคร",
    "11": "สมุทรปราการ",
    "12": "นนทบุรี",
    "13": "ปทุมธานี",
    "14": "พระนครศรีอยุธยา",
    "15": "อ่างทอง",
    "16": "ลพบุรี",
    "17": "สิงห์บุรี",
    "18": "ชัยนาท",
    "19": "สระบุรี",
    "20": "ชลบุรี",
    "21": "ระยอง",
    "22": "จันทบุรี",
    "23": "ตราด",
    "24": "ฉะเชิงเทรา",
    "25": "ปราจีนบุรี",
    "26": "นครนายก",
    "27": "สระแก้ว",
    "30": "นครราชสีมา",
    "31": "บุรีรัมย์",
    "32": "สุรินทร์",
    "33": "ศรีสะเกษ",
    "34": "อุบลราชธานี",
    "35": "ยโสธร",
    "36": "ชัยภูมิ",
    "37": "อำนาจเจริญ",
    "38": "บึงกาฬ",
    "39": "หนองบัวลำภู",
    "40": "ขอนแก่น",
    "41": "อุดรธานี",
    "42": "เลย",
    "43": "หนองคาย",
    "44": "มหาสารคาม",
    "45": "ร้อยเอ็ด",
    "46": "กาฬสินธุ์",
    "47": "สกลนคร",
    "48": "นครพนม",
    "49": "มุกดาหาร",
    "50": "เชียงใหม่",
    "51": "ลำพูน",
    "52": "ลำปาง",
    "53": "อุตรดิตถ์",
    "54": "แพร่",
    "55": "น่าน",
    "56": "พะเยา",
    "57": "เชียงราย",
    "58": "แม่ฮ่องสอน",
    "60": "นครสวรรค์",
    "61": "อุทัยธานี",
    "62": "กำแพงเพชร",
    "63": "ตาก",
    "64": "สุโขทัย",
    "65": "พิษณุโลก",
    "66": "พิจิตร",
    "67": "เพชรบูรณ์",
    "70": "ราชบุรี",
    "71": "กาญจนบุรี",
    "72": "สุพรรณบุรี",
    "73": "นครปฐม",
    "74": "สมุทรสาคร",
    "75": "สมุทรสงคราม",
    "76": "เพชรบุรี",
    "77": "ประจวบคีรีขันธ์",
    "80": "นครศรีธรรมราช",
    "81": "กระบี่",
    "82": "พังงา",
    "83": "ภูเก็ต",
    "84": "สุราษฎร์ธานี",
    "85": "ระนอง",
    "86": "ชุมพร",
    "90": "สงขลา",
    "91": "สตูล",
    "92": "ตรัง",
    "93": "พัทลุง",
    "94": "ปัตตานี",
    "95": "ยะลา",
    "96": "นราธิวาส"
  };

  // Map amphure codes to Thai names
  const amphureMap: Record<string, string> = {
    // Example amphure mappings - you'll need to add all relevant ones
    "4001": "เมืองขอนแก่น",
    "4002": "บ้านฝาง",
    "4003": "พระยืน",
    "4004": "หนองเรือ",
    "4005": "ชุมแพ",
    "4006": "สีชมพู",
    "4007": "น้ำพอง",
    "4008": "อุบลรัตน์",
    "4009": "กระนวน",
    "4010": "บ้านไผ่",
    "4011": "เปือยน้อย",
    "4012": "พล",
    "4013": "แวงใหญ่",
    "4014": "แวงน้อย",
    "4015": "หนองสองห้อง",
    "4016": "ภูเวียง",
    "4017": "มัญจาคีรี",
    "4018": "ชนบท",
    "4019": "เขาสวนกวาง",
    "4020": "ภูผาม่าน",
    "4021": "ซำสูง",
    "4022": "โคกโพธิ์ไชย",
    "4023": "หนองนาคำ",
    "4024": "บ้านแฮด",
    "4025": "โนนศิลา",
    "4026": "เวียงเก่า",
    "4101": "เมืองอุดรธานี",
    "4102": "กุดจับ",
    "4103": "หนองวัวซอ",
    "4104": "กุมภวาปี",
    "4105": "โนนสะอาด",
    "4106": "หนองหาน",
    "4107": "ทุ่งฝน",
    "4108": "ไชยวาน",
    "4109": "ศรีธาตุ",
    "4110": "วังสามหมอ",
    "4111": "บ้านดุง",
    "4117": "บ้านผือ",
    "4118": "น้ำโสม",
    "4119": "เพ็ญ",
    "4120": "สร้างคอม",
    "4121": "หนองแสง",
    "4122": "นายูง",
    "4123": "พิบูลย์รักษ์",
    "4124": "กู่แก้ว",
    "4125": "ประจักษ์ศิลปาคม",
    "5401": "เมืองแพร่",
    "5402": "ร้องกวาง",
    "5403": "ลอง",
    "5404": "สูงเม่น",
    "5405": "เด่นชัย",
    "5406": "สอง",
    "5407": "วังชิ้น",
    "5408": "หนองม่วงไข่",
    "6401": "เมืองสุโขทัย",
    "6402": "บ้านด่านลานหอย",
    "6403": "คีรีมาศ",
    "6404": "กงไกรลาศ",
    "6405": "ศรีสัชนาลัย",
    "6406": "ศรีสำโรง",
    "6407": "สวรรคโลก",
    "6408": "ศรีนคร",
    "6409": "ทุ่งเสลี่ยม",
    // Add more amphure mappings as needed
  };

  // Get province name
  const provinceName = provinceMap[provinceCode] || null;
  if (!provinceName) {
    return null;
  }

  // Get amphure name
  const amphureName = amphureMap[amphureCode] || `รหัส ${amphureCode}`;

  return {
    provinceName,
    amphureName
  };
}

async function ensureLocationTables(client: pkg.PoolClient) {
  // Create provinces table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS provinces (
      province_code TEXT PRIMARY KEY,
      province_name TEXT NOT NULL
    );
  `);

  // Create amphures table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS amphures (
      amphure_code TEXT PRIMARY KEY,
      province_code TEXT REFERENCES provinces(province_code),
      amphure_name TEXT NOT NULL
    );
  `);

  // Add indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_amphures_province_code ON amphures(province_code);
  `);
}

// Add amphure code to name mapping
const amphureCodeToName: Record<string, string> = {
  "5023": "ดอยสะเก็ด",
  "5104": "บ้านธิ",
  "5011": "สันกำแพง",
  "5021": "แม่ออน",
  "5004": "สันทราย",
  "5003": "แม่แตง",
  "5102": "ป่าซาง",
  "3601": "ชัยภูมิ",
  "4404": "โกสุมพิสัย",
  "4716": "วานรนิวาส",
  "4708": "วาริชภูมิ",
  "4701": "เมืองสกลนคร",
  "4616": "สมเด็จ",
  "4610": "กุฉินารายณ์",
  "4718": "คำตากล้า",
  "4507": "จตุรพักตรพิมาน"
};

async function importMissingRecords(client: pkg.PoolClient, excelData: ReservoirRow[], existingNames: Set<string>) {
  logger.info('Starting import of missing records...');
  
  const insertedRecords = [];
  const skippedRecords = [];
  
  for (const row of excelData) {
    const normalizedName = normalizeReservoirName(row.nresv);
    
    // Skip if already exists
    if (existingNames.has(normalizedName)) {
      continue;
    }
    
    try {
      // Ensure proper prefix
      const reservoirName = row.nresv.startsWith('อ่างเก็บน้ำ') ? 
        row.nresv : 
        `อ่างเก็บน้ำ${row.nresv}`;
      
      // Extract location data
      let provinceCode = null;
      let amphureCode = null;
      let provinceName = null;
      let amphureName = null;
      
      if (row.tamboncode && row.tamboncode.toString().length === 8) {
        const codes = extractLocationCodes(row.tamboncode.toString());
        if (codes) {
          provinceCode = codes.provinceCode;
          amphureCode = codes.amphureCode;
          
          const names = getLocationNames(row.tamboncode.toString());
          if (names) {
            provinceName = names.provinceName;
            amphureName = names.amphureName;
          }
        }
      }
      
      // Insert the record
      const result = await client.query(`
        INSERT INTO reservoir (
          reservoir_name,
          type,
          amphure_code,
          amphure,
          province_name,
          reservoir_id,
          project_id,
          project_name,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        RETURNING id, reservoir_name;
      `, [
        reservoirName,
        'อ่างเก็บน้ำขนาดกลาง',
        amphureCode,
        amphureName || (amphureCode ? `รหัส ${amphureCode}` : null),
        provinceName,
        row.cresv || null,
        row.project_id || null,
        row.project_name || null,
        row.status || null
      ]);
      
      if (result.rowCount && result.rowCount > 0) {
        insertedRecords.push({
          id: result.rows[0].id,
          name: result.rows[0].reservoir_name,
          tambonCode: row.tamboncode
        });
        logger.info(`Inserted reservoir: ${result.rows[0].reservoir_name} (${result.rows[0].id})`);
      }
      
    } catch (error) {
      const err = error as Error;
      skippedRecords.push({
        name: row.nresv,
        error: err.message
      });
      logger.warn(`Failed to insert reservoir ${row.nresv}:`, err.message);
    }
  }
  
  logger.info(`Import completed. Inserted ${insertedRecords.length} records, skipped ${skippedRecords.length} records`);
  if (skippedRecords.length > 0) {
    logger.info('Skipped records:', skippedRecords);
  }
  
  return {
    inserted: insertedRecords,
    skipped: skippedRecords
  };
}

// Add this new function to read amphure mappings
async function readAmphureMappings(): Promise<Record<string, string>> {
  const excelPath = path.join(__dirname, '../../../../amphure_coding.xlsx');
  logger.info('Reading amphure mappings from:', excelPath);
  
  try {
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(worksheet);
    logger.info('First row from amphure_coding.xlsx:', data[0]);

    const amphureMap: Record<string, string> = {};
    data.forEach((row: any) => {
      // Using the correct column names from the Excel file
      const code = row.amphure_code?.toString();
      const name = row.thai_amphure_name;
      
      if (code && name) {
        // Pad the code with leading zeros if needed to match the format in the database
        const paddedCode = code.padStart(4, '0');
        amphureMap[paddedCode] = name;
      }
    });

    logger.info(`Loaded ${Object.keys(amphureMap).length} amphure mappings`);
    logger.info('Sample mappings:', Object.entries(amphureMap).slice(0, 3));
    
    return amphureMap;
  } catch (error) {
    const err = error as Error;
    logger.error('Error reading amphure_coding.xlsx:', {
      message: err.message,
      path: excelPath
    });
    return {};
  }
}

// Modify executeSQL function to include import of missing records
async function executeSQL() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting reservoir table update...');

    // Load amphure mappings
    const amphureMappings = await readAmphureMappings();
    
    // Start transaction
    await client.query('BEGIN');

    // Add all required columns if they don't exist
    await client.query(`
      ALTER TABLE reservoir 
      ADD COLUMN IF NOT EXISTS amphure_code TEXT,
      ADD COLUMN IF NOT EXISTS amphure TEXT,
      ADD COLUMN IF NOT EXISTS province_name TEXT,
      ADD COLUMN IF NOT EXISTS project_id TEXT,
      ADD COLUMN IF NOT EXISTS project_name TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT,
      ADD COLUMN IF NOT EXISTS reservoir_id TEXT;
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservoir_project_id ON reservoir(project_id);
      CREATE INDEX IF NOT EXISTS idx_reservoir_reservoir_id ON reservoir(reservoir_id);
    `);

    // Update existing records with proper amphure names
    const updateQuery = `
      UPDATE reservoir 
      SET amphure = $1
      WHERE amphure = $2 AND amphure_code = $3;
    `;

    for (const [code, name] of Object.entries(amphureMappings)) {
      await client.query(updateQuery, [
        name,
        `รหัส ${code}`,
        code
      ]);
    }

    // Get current database records
    const { rows: dbRecords } = await client.query(`
      SELECT reservoir_name
      FROM reservoir 
      WHERE type = 'อ่างเก็บน้ำขนาดกลาง';
    `);
    
    const existingNames = new Set(dbRecords.map(r => normalizeReservoirName(r.reservoir_name)));
    
    // Read Excel file
    const excelData = await readExcelFile();
    
    // Import missing records
    const importResults = await importMissingRecords(client, excelData, existingNames);
    
    logger.info(`Successfully imported ${importResults.inserted.length} new records`);

    await client.query('COMMIT');
    logger.info('✅ Successfully updated reservoir table');

  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    logger.error('❌ Error updating reservoir table:', {
      message: err.message,
      stack: err.stack,
      error: JSON.stringify(err, null, 2)
    });
    throw err;
  } finally {
    client.release();
  }
}

async function checkRecordCounts() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting detailed record analysis...');

    // Read Excel file
    const excelPath = path.join(__dirname, '../../../../reservior (tumbon code).xlsx');
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = xlsx.utils.sheet_to_json(worksheet) as ReservoirRow[];
    
    logger.info(`Excel file contains ${excelData.length} total records`);

    // Get database records
    const { rows: dbRecords } = await client.query(`
      SELECT 
        id,
        reservoir_name,
        type,
        amphure,
        province_name,
        reservoir_id
      FROM reservoir 
      WHERE type = 'อ่างเก็บน้ำขนาดกลาง'
      ORDER BY reservoir_name;
    `);
    
    logger.info(`Database contains ${dbRecords.length} medium reservoirs`);

    // Analyze Excel data
    const excelAnalysis = {
      totalCount: excelData.length,
      withTambonCode: excelData.filter(r => r.tamboncode && typeof r.tamboncode === 'string').length,
      withoutTambonCode: excelData.filter(r => !r.tamboncode || typeof r.tamboncode !== 'string').length,
      uniqueProvinces: new Set(
        excelData
          .filter(r => r.tamboncode && typeof r.tamboncode === 'string')
          .map(r => r.tamboncode.substring(0, 2))
      ).size,
      uniqueAmphures: new Set(
        excelData
          .filter(r => r.tamboncode && typeof r.tamboncode === 'string')
          .map(r => r.tamboncode.substring(0, 4))
      ).size
    };

    logger.info('Excel Data Analysis:', {
      ...excelAnalysis,
      missingTambonCodePercentage: ((excelAnalysis.withoutTambonCode / excelAnalysis.totalCount) * 100).toFixed(2) + '%'
    });

    // Find records in Excel but not in DB
    const dbNames = new Set(dbRecords.map(r => normalizeReservoirName(r.reservoir_name)));
    const missingInDb = excelData.filter(excelRow => {
      const normalizedName = normalizeReservoirName(excelRow.nresv);
      return !dbNames.has(normalizedName);
    });

    logger.info(`Found ${missingInDb.length} records in Excel that are not in the database`);
    if (missingInDb.length > 0) {
      logger.info('Sample of missing records:', missingInDb.slice(0, 5).map(r => ({
        name: r.nresv,
        tambonCode: r.tamboncode,
        projectId: r.project_id
      })));
    }

    // Find records in DB but not in Excel
    const excelNames = new Set(excelData.map(r => normalizeReservoirName(r.nresv)));
    const missingInExcel = dbRecords.filter(dbRow => {
      const normalizedName = normalizeReservoirName(dbRow.reservoir_name);
      return !excelNames.has(normalizedName);
    });

    logger.info(`Found ${missingInExcel.length} records in database that are not in Excel`);
    if (missingInExcel.length > 0) {
      logger.info('Sample of records only in database:', missingInExcel.slice(0, 5).map(r => ({
        name: r.reservoir_name,
        type: r.type,
        amphure: r.amphure,
        province: r.province_name
      })));
    }

    // Check for potential duplicates in Excel
    const nameCount = new Map<string, number>();
    excelData.forEach(row => {
      const normalizedName = normalizeReservoirName(row.nresv);
      nameCount.set(normalizedName, (nameCount.get(normalizedName) || 0) + 1);
    });

    const duplicatesInExcel = Array.from(nameCount.entries())
      .filter(([_, count]) => count > 1)
      .map(([name, count]) => ({ name, count }));

    if (duplicatesInExcel.length > 0) {
      logger.info(`Found ${duplicatesInExcel.length} potential duplicates in Excel:`, 
        duplicatesInExcel.slice(0, 5));
    }

    // Analyze naming patterns
    const namingPatterns = {
      withPrefix: dbRecords.filter(r => r.reservoir_name.startsWith('อ่างเก็บน้ำ')).length,
      withoutPrefix: dbRecords.filter(r => !r.reservoir_name.startsWith('อ่างเก็บน้ำ')).length
    };

    logger.info('Naming pattern analysis:', {
      withPrefix: namingPatterns.withPrefix,
      withoutPrefix: namingPatterns.withoutPrefix,
      prefixPercentage: ((namingPatterns.withPrefix / dbRecords.length) * 100).toFixed(2) + '%'
    });

    // Check records with 'รหัส' in amphure
    const { rows: recordsWithCode } = await client.query(`
      SELECT 
        id,
        reservoir_name,
        amphure,
        amphure_code,
        province_name,
        project_id
      FROM reservoir 
      WHERE type = 'อ่างเก็บน้ำขนาดกลาง' 
      AND amphure LIKE 'รหัส%'
      ORDER BY province_name, amphure;
    `);
    
    logger.info(`Found ${recordsWithCode.length} records with 'รหัส' in amphure field:`);
    recordsWithCode.forEach(record => {
      logger.info(`Record ID: ${record.id}`, {
        reservoir: record.reservoir_name,
        amphure: record.amphure,         // This shows the full 'รหัส XXXX'
        amphureCode: record.amphure_code,
        province: record.province_name
      });
    });

  } catch (error) {
    const err = error as Error;
    logger.error('Error analyzing records:', {
      message: err.message,
      stack: err.stack
    });
    throw err;
  } finally {
    client.release();
  }
}

// Modify the script execution to avoid double pool.end()
Promise.all([executeSQL(), checkRecordCounts()])
  .then(() => {
    logger.info('All operations completed successfully');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    const err = error as Error & { code?: string, detail?: string };
    logger.error('Script failed:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack,
      error: JSON.stringify(err, null, 2)
    });
    pool.end();
    process.exit(1);
  }); 