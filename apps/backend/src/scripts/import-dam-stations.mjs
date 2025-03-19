import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const { Pool } = pkg;

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Excel file
const EXCEL_FILE_PATH = path.resolve(__dirname, '../../../../Report_dam_station_2025-02-05_V0.5 LH.xlsx');

// Database pool with credentials from environment variables
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

async function importDamStations() {
  try {
    console.log(`Reading Excel file from: ${EXCEL_FILE_PATH}`);
    
    // Check if file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`Excel file not found at: ${EXCEL_FILE_PATH}`);
      return;
    }
    
    // Read the Excel file
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} records in Excel file`);
    
    // Connect to the database
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // Get the next ID to use
      const maxIdResult = await client.query('SELECT MAX(id) FROM reservoir_locations');
      let nextId = 1;
      if (maxIdResult.rows[0].max) {
        nextId = parseInt(maxIdResult.rows[0].max) + 1;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process each row
      for (const row of data) {
        try {
          // Debug first few rows
          if (successCount === 0) {
            console.log('Sample row from Excel:', JSON.stringify(row));
            console.log('Available columns:', Object.keys(row));
          }
          
          // Expected field names from Excel - checking multiple possible column names
          const reservoirName = row['อ่างเก็บน้ำ/เขื่อน'] || row['เขื่อน/อ่างฯ'] || row['ชื่ออ่างเก็บน้ำ'] || row['__EMPTY'] || row['หัวงาน'];
          const province = row['จังหวัด'];
          const amphure = row['อำเภอ'];
          
          // Multiple possible names for latitude/longitude columns
          let latitude = row['Latitude'] || row['ละติจูด'] || row['ละติจูด (เหนือ)'] || row['LAT'] || row['lat'];
          let longitude = row['Longitude'] || row['ลองจิจูด'] || row['ลองจิจูด (ตะวันออก)'] || row['LONG'] || row['long'];
          
          // Check if there's a combined coordinate field
          if (!latitude || !longitude) {
            const possibleCoordFields = ['พิกัด', 'พิกัดภูมิศาสตร์', 'พิกัด UTM'];
            for (const field of possibleCoordFields) {
              if (row[field]) {
                // Try to parse coordinates
                const coordStr = row[field].toString();
                
                // Check for latitude format: e.g., "18° 55' 11.32" N"
                const latMatch = coordStr.match(/(\d+)[°\s]+(\d+)[''\s]+(\d+(\.\d+)?)["\s]+([NS])/i);
                if (latMatch) {
                  const deg = parseFloat(latMatch[1]);
                  const min = parseFloat(latMatch[2]);
                  const sec = parseFloat(latMatch[3]);
                  const dir = latMatch[5].toUpperCase();
                  
                  // Convert to decimal degrees
                  latitude = deg + (min / 60) + (sec / 3600);
                  if (dir === 'S') latitude = -latitude;
                }
                
                // Check for longitude format: e.g., "99° 53' 28.56" E"
                const lonMatch = coordStr.match(/(\d+)[°\s]+(\d+)[''\s]+(\d+(\.\d+)?)["\s]+([EW])/i);
                if (lonMatch) {
                  const deg = parseFloat(lonMatch[1]);
                  const min = parseFloat(lonMatch[2]);
                  const sec = parseFloat(lonMatch[3]);
                  const dir = lonMatch[5].toUpperCase();
                  
                  // Convert to decimal degrees
                  longitude = deg + (min / 60) + (sec / 3600);
                  if (dir === 'W') longitude = -longitude;
                }
                
                // Check for simple decimal format: e.g., "18.123456, 99.123456"
                const decimalMatch = coordStr.match(/(\d+\.\d+)[,\s]+(\d+\.\d+)/);
                if (decimalMatch && !latitude && !longitude) {
                  latitude = parseFloat(decimalMatch[1]);
                  longitude = parseFloat(decimalMatch[2]);
                }
              }
            }
          }
          
          // Skip rows that are clearly not dam/reservoir (they are river monitoring stations)
          if (row['สถานีวัดน้ำท่า']) {
            console.log(`Skipping river monitoring station: ${row['สถานีวัดน้ำท่า']} ${row['__EMPTY'] || ''}`);
            continue;
          }
          
          // Skip if essential data is missing
          if (!reservoirName || !latitude || !longitude) {
            console.warn(`Skipping row due to missing essential data: ${JSON.stringify(row)}`);
            errorCount++;
            continue;
          }
          
          // Convert lat/long to text to preserve precision
          const latText = String(latitude);
          const longText = String(longitude);
          
          // Check if reservoir name already exists
          const checkQuery = 'SELECT id FROM reservoir_locations WHERE reservoir_name = $1';
          const checkResult = await client.query(checkQuery, [reservoirName]);
          
          if (checkResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
              UPDATE reservoir_locations
              SET reservoir_lat = $1, reservoir_long = $2, province = $3, amphure = $4, updated_at = CURRENT_TIMESTAMP
              WHERE reservoir_name = $5
              RETURNING id
            `;
            
            const updateResult = await client.query(updateQuery, [
              latText, longText, province, amphure, reservoirName
            ]);
            
            console.log(`Updated existing record: ${reservoirName}, ID: ${updateResult.rows[0].id}`);
          } else {
            // Insert new record
            const insertQuery = `
              INSERT INTO reservoir_locations
              (id, reservoir_name, reservoir_lat, reservoir_long, province, amphure, data_source, reservoir_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id
            `;
            
            // Generate a reservoir_id like "rsvXXX" where XXX is a zero-padded number
            const reservoirId = `rsv${String(nextId).padStart(3, '0')}`;
            
            const insertResult = await client.query(insertQuery, [
              nextId, reservoirName, latText, longText, province, amphure, 'dam_excel', reservoirId
            ]);
            
            console.log(`Inserted new record: ${reservoirName}, ID: ${insertResult.rows[0].id}`);
            nextId++;
          }
          
          successCount++;
        } catch (rowError) {
          console.error(`Error processing row: ${JSON.stringify(row)}`, rowError);
          errorCount++;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`Import completed. Successful: ${successCount}, Errors: ${errorCount}`);
      
      // Get count of records
      const countResult = await client.query('SELECT COUNT(*) FROM reservoir_locations');
      console.log(`Total records in reservoir_locations table: ${countResult.rows[0].count}`);
      
    } catch (dbError) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Database error during import:', dbError);
    } finally {
      // Release the client back to the pool
      client.release();
      console.log('Database connection released.');
    }
  } catch (error) {
    console.error('Error importing dam stations:', error);
  } finally {
    // End the pool
    await pool.end();
    console.log('Database pool ended.');
  }
}

// Run the function
importDamStations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 