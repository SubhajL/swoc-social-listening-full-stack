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
    
    // Get the dams/reservoirs sheet - "อ่างเก็บน้ำ-เขื่อน"
    const sheetName = 'อ่างเก็บน้ำ-เขื่อน';
    
    if (!workbook.SheetNames.includes(sheetName)) {
      console.error(`Sheet '${sheetName}' not found in the Excel file.`);
      return;
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} records in sheet '${sheetName}'`);
    
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
      let skippedCount = 0;
      
      // Process each row
      for (const row of data) {
        try {
          // Expected field names from Excel based on the inspection
          const reservoirName = row['อ่างเก็บน้ำ/เขื่อน']; // Dam/Reservoir name
          const province = row['จังหวัด']; // Province
          const amphure = row['อำเภอ'] || ''; // Amphure - now optional
          const basin = row['ลุ่มน้ำ']; // Basin
          const capacity = row['ความจุ รนก. \r\n(ล้าน ลบ.ม.)']; // Capacity
          const minCapacity = row['ปริมาณน้ำ รนก. ต่ำสุด\r\n (ล้าน ลบ.ม.)']; // Min capacity
          const notes = row['หมายเหตุ']; // Notes
          
          // Skip if essential data is missing (only reservoir_name and province are required)
          if (!reservoirName || !province) {
            console.warn(`Skipping row due to missing essential data (reservoir_name or province): ${JSON.stringify(row)}`);
            skippedCount++;
            continue;
          }
          
          // Skip potential header rows or invalid data rows
          if (typeof reservoirName !== 'string' || reservoirName.includes('อ่างเก็บน้ำ/เขื่อน')) {
            console.log(`Skipping header or invalid row: ${reservoirName}`);
            skippedCount++;
            continue;
          }
          
          // Check if reservoir name already exists
          const checkQuery = 'SELECT id FROM reservoir_locations WHERE reservoir_name = $1';
          const checkResult = await client.query(checkQuery, [reservoirName]);
          
          if (checkResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
              UPDATE reservoir_locations
              SET province = $1, amphure = $2, updated_at = CURRENT_TIMESTAMP, data_source = $3
              WHERE reservoir_name = $4
              RETURNING id
            `;
            
            const updateResult = await client.query(updateQuery, [
              province, amphure, 'dam_excel_v3', reservoirName
            ]);
            
            console.log(`Updated existing record: ${reservoirName}, ID: ${updateResult.rows[0].id}`);
          } else {
            // Insert new record
            const insertQuery = `
              INSERT INTO reservoir_locations
              (id, reservoir_name, province, amphure, data_source, reservoir_id, metadata)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id
            `;
            
            // Generate a reservoir_id like "rsvXXX" where XXX is a zero-padded number
            const reservoirId = `rsv${String(nextId).padStart(3, '0')}`;
            
            // Create metadata JSON
            const metadata = {
              basin: basin,
              capacity: capacity,
              min_capacity: minCapacity,
              notes: notes,
              source: 'Report_dam_station_2025-02-05_V0.5 LH.xlsx'
            };
            
            const insertResult = await client.query(insertQuery, [
              nextId, reservoirName, province, amphure, 'dam_excel_v3', reservoirId, JSON.stringify(metadata)
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
      
      console.log(`Import completed. Successful: ${successCount}, Errors: ${errorCount}, Skipped: ${skippedCount}`);
      
      // Get count of records
      const countResult = await client.query('SELECT COUNT(*) FROM reservoir_locations');
      console.log(`Total records in reservoir_locations table: ${countResult.rows[0].count}`);
      
      // Get count by data source
      const sourceCountQuery = `
        SELECT data_source, COUNT(*) 
        FROM reservoir_locations 
        GROUP BY data_source
        ORDER BY COUNT(*) DESC
      `;
      const sourceCountResult = await client.query(sourceCountQuery);
      console.log('Records by data source:');
      sourceCountResult.rows.forEach(row => {
        console.log(`  ${row.data_source}: ${row.count}`);
      });
      
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