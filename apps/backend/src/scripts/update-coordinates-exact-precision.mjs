import pkg from 'pg';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Path to Excel file (relative to project root)
const EXCEL_FILE_PATH = path.resolve(__dirname, '../../../../reservior (tumbon code).xlsx');

async function updateCoordinatesWithExactPrecision() {
  const client = await pool.connect();
  let updatedCount = 0;
  let errorCount = 0;
  
  try {
    // Read Excel file
    console.log(`Reading Excel file from: ${EXCEL_FILE_PATH}`);
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    console.log(`Successfully read ${data.length} records from Excel`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // First, modify the column type to ensure it can store the full precision
    console.log('Altering column types to ensure full precision storage...');
    await client.query(`
      ALTER TABLE reservoir_locations 
      ALTER COLUMN reservoir_lat TYPE TEXT,
      ALTER COLUMN reservoir_long TYPE TEXT;
    `);
    
    console.log('Column types altered successfully');
    
    // Update each reservoir with exact precision from Excel
    for (const row of data) {
      const reservoirId = row.cresv;
      const latitude = row.cresv_lat;
      const longitude = row.cresv_lng;
      
      if (!reservoirId || latitude === undefined || longitude === undefined) {
        console.warn(`Missing data for row: ${JSON.stringify(row)}`);
        continue;
      }
      
      // Convert to string with exact precision
      const latString = latitude.toString();
      const longString = longitude.toString();
      
      // Update the database with exact precision
      const updateQuery = `
        UPDATE reservoir_locations
        SET 
          reservoir_lat = $1,
          reservoir_long = $2,
          updated_at = NOW()
        WHERE reservoir_id= $3
        RETURNING *
      `;
      
      try {
        const result = await client.query(updateQuery, [latString, longString, reservoirId]);
        
        if (result.rowCount > 0) {
          console.log(`Updated coordinates for ${reservoirId}: (${latString}, ${longString})`);
          updatedCount++;
        } else {
          console.warn(`No record found for reservoir_id: ${reservoirId}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error updating coordinates for ${reservoirId}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log(`Coordinates update completed: ${updatedCount} records updated, ${errorCount} errors`);
    
    // Export the updated data to JSON
    const exportQuery = `SELECT * FROM reservoir_locations ORDER BY reservoir_id`;
    const exportResult = await client.query(exportQuery);
    const outputPath = path.resolve(__dirname, '../../../../reservoir_locations_exact_precision.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportResult.rows, null, 2));
    console.log(`Exported data to: ${outputPath}`);
    
    // Verify a few records
    const verifyQuery = `
      SELECT reservoir_id, 
        reservoir_name, 
        reservoir_lat, 
        reservoir_long
      FROM reservoir_locations 
      WHERE reservoir_id IN ('rsv01', 'rsv02', 'rsv10')
      ORDER BY formatted_id
    `;
    
    const verifyResult = await client.query(verifyQuery);
    console.log('\nVerification of updated records:');
    console.table(verifyResult.rows);
    
    return { updatedCount, errorCount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
updateCoordinatesWithExactPrecision().then(() => {
  console.log('Update completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 