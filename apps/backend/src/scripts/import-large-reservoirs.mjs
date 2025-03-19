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

async function importLargeReservoirs() {
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
    
    // Filter to only include large reservoirs
    const largeReservoirs = data.filter(row => {
      return row['หมายเหตุ'] === 'อ่างเก็บน้ำขนาดใหญ่';
    });
    
    console.log(`Found ${largeReservoirs.length} large reservoirs`);
    
    // Exit if no large reservoirs found
    if (largeReservoirs.length === 0) {
      console.log("No large reservoirs found in the Excel file");
      return;
    }
    
    // Print the large reservoirs for verification
    console.log("\nLarge reservoirs to be imported:");
    largeReservoirs.forEach((reservoir, index) => {
      console.log(`${index + 1}. ${reservoir['อ่างเก็บน้ำ/เขื่อน']} - ${reservoir['จังหวัด']} ${reservoir['อำเภอ'] || '(No amphure)'}`)
    });
    
    // Connect to the database
    console.log('\nConnecting to database...');
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
      
      // Process each large reservoir
      for (const reservoir of largeReservoirs) {
        try {
          const reservoirName = reservoir['อ่างเก็บน้ำ/เขื่อน'];
          const province = reservoir['จังหวัด'];
          const amphure = reservoir['อำเภอ'];
          
          // Skip if reservoir_name is missing (should never happen as we filtered already)
          if (!reservoirName) {
            console.warn(`Skipping row due to missing reservoir name: ${JSON.stringify(reservoir)}`);
            skippedCount++;
            continue;
          }
          
          // Check if the reservoir already exists
          const checkResult = await client.query(
            'SELECT id FROM reservoir_locations WHERE reservoir_name = $1',
            [reservoirName]
          );
          
          if (checkResult.rows.length > 0) {
            console.log(`Updating existing reservoir: ${reservoirName}`);
            // Update existing record
            const updateQuery = `
              UPDATE reservoir_locations
              SET province = $1, amphure = $2, data_source = $3, updated_at = NOW()
              WHERE reservoir_name = $4
            `;
            
            await client.query(updateQuery, [
              province,
              amphure,
              'dam',
              reservoirName
            ]);
          } else {
            console.log(`Inserting new reservoir: ${reservoirName}`);
            // Insert new record
            const insertQuery = `
              INSERT INTO reservoir_locations
              (id, reservoir_name, province, amphure, data_source, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `;
            
            await client.query(insertQuery, [
              nextId,
              reservoirName,
              province,
              amphure,
              'dam'
            ]);
            
            // Increment the ID for the next insertion
            nextId++;
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error processing reservoir: ${JSON.stringify(reservoir)} error: ${error.message}`);
          errorCount++;
          
          // If this is the first error, we need to rollback the transaction
          if (successCount + errorCount + skippedCount === 1) {
            await client.query('ROLLBACK');
            await client.query('BEGIN');
          }
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
    console.error('Error importing large reservoirs:', error);
  } finally {
    // End the pool
    await pool.end();
    console.log('Database pool ended.');
  }
}

// Run the function
importLargeReservoirs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 