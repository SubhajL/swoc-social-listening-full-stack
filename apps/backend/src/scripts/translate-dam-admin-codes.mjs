import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to CSV file and output file
const CSV_FILE_PATH = path.resolve(__dirname, '../../../../!DAMInfo_201911271750.csv');
const OUTPUT_PATH = path.resolve(__dirname, '../../../../dam_info_with_admin_locations.json');

// Setup database connection
const { Pool } = pkg;
const pool = new Pool({
  user: process.env.DB_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.DB_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  host: process.env.DB_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '15435'),
  database: process.env.DB_NAME || 'swoc-uat-gis-ssl',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fetchAdminLocationNames() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching administrative location data from database...');
    
    // Check if the required tables exist
    const checkTablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('provinces', 'amphures', 'tambons');
    `;
    
    const tablesResult = await client.query(checkTablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    if (existingTables.length < 3) {
      console.warn(`Warning: Some admin tables are missing. Found: ${existingTables.join(', ')}`);
    }
    
    // Fetch provinces
    const provinces = {};
    if (existingTables.includes('provinces')) {
      const provincesQuery = `SELECT id, name_th FROM provinces;`;
      const provincesResult = await client.query(provincesQuery);
      provincesResult.rows.forEach(row => {
        provinces[row.id] = row.name_th;
      });
      console.log(`Fetched ${Object.keys(provinces).length} provinces`);
    }
    
    // Fetch amphures
    const amphures = {};
    if (existingTables.includes('amphures')) {
      const amphuresQuery = `SELECT id, name_th, province_id FROM amphures;`;
      const amphuresResult = await client.query(amphuresQuery);
      amphuresResult.rows.forEach(row => {
        amphures[row.id] = { name: row.name_th, provinceId: row.province_id };
      });
      console.log(`Fetched ${Object.keys(amphures).length} amphures`);
    }
    
    // Fetch tambons
    const tambons = {};
    if (existingTables.includes('tambons')) {
      const tambonsQuery = `SELECT id, name_th, amphure_id FROM tambons;`;
      const tambonsResult = await client.query(tambonsQuery);
      tambonsResult.rows.forEach(row => {
        tambons[row.id] = { name: row.name_th, amphureId: row.amphure_id };
      });
      console.log(`Fetched ${Object.keys(tambons).length} tambons`);
    }
    
    return { provinces, amphures, tambons };
  } finally {
    client.release();
  }
}

function getLocationFromCode(code, locations) {
  if (!code || !locations) return null;
  return locations[code] || null;
}

async function translateDamAdminCodes() {
  try {
    // First check if we can get location data from database
    let adminLocationsFromDB = null;
    try {
      adminLocationsFromDB = await fetchAdminLocationNames();
    } catch (dbError) {
      console.warn(`Could not fetch admin locations from database: ${dbError.message}`);
      console.log('Continuing with code-to-name translation without database...');
    }
    
    console.log(`Reading CSV file from: ${CSV_FILE_PATH}`);
    
    // Read the CSV file
    const csvData = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    
    // Parse CSV
    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Find indices of code columns
    const provinceCodeIndex = headers.indexOf('provincecode');
    const amphurCodeIndex = headers.indexOf('ampurcode');
    const tambonCodeIndex = headers.indexOf('tamboncode');
    
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
        continue;
      }
      
      // Create record object
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ? values[index].trim() : '';
      });
      
      // Add location names if available
      if (adminLocationsFromDB) {
        const { provinces, amphures, tambons } = adminLocationsFromDB;
        
        // Get province code and try to find the name
        const provinceCode = record.provincecode;
        if (provinceCode) {
          // For province codes, we need to format them correctly
          // The code in CSV might be like 50000000, but in DB it might be just 50
          const formattedProvinceCode = parseInt(provinceCode.substring(0, 2));
          const province = getLocationFromCode(formattedProvinceCode, provinces);
          if (province) {
            record.provinceName = province;
          }
        }
        
        // Get amphur code and try to find the name
        const amphurCode = record.ampurcode;
        if (amphurCode) {
          // For amphur codes, format: 50140000 -> 5014
          const formattedAmphurCode = parseInt(amphurCode.substring(0, 4));
          const amphur = getLocationFromCode(formattedAmphurCode, amphures);
          if (amphur) {
            record.amphureName = amphur.name;
          }
        }
        
        // Get tambon code and try to find the name
        const tambonCode = record.tamboncode;
        if (tambonCode) {
          // For tambon codes, format: 50140600 -> 501406
          const formattedTambonCode = parseInt(tambonCode.substring(0, 6));
          const tambon = getLocationFromCode(formattedTambonCode, tambons);
          if (tambon) {
            record.tambonName = tambon.name;
          }
        }
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
    
    // Create output structure
    const outputData = {
      metadata: {
        totalDams: processedRecords.length,
        source: '!DAMInfo_201911271750.csv',
        exportDate: new Date().toISOString(),
        regions: Object.keys(damsByRegion),
        hasLocationNames: !!adminLocationsFromDB
      },
      damsByRegion: damsByRegion,
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
      provinceCode: dam.provincecode,
      provinceName: dam.provinceName || 'Unknown',
      amphurCode: dam.ampurcode,
      amphureName: dam.amphureName || 'Unknown',
      tambonCode: dam.tamboncode,
      tambonName: dam.tambonName || 'Unknown'
    })));
    
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