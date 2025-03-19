import pkg from 'pg';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pkg;

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

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

/**
 * Imports reservoir locations data from Excel file into PostgreSQL
 */
async function importReservoirLocations() {
  console.log('[ReservoirLocationsImport] Starting import from Excel file');

  try {
    // First, check the table structure
    const client = await pool.connect();
    try {
      console.log('[ReservoirLocationsImport] Checking table structure');
      const tableInfo = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'reservoir_locations'
      `);
      
      console.log('[ReservoirLocationsImport] Table columns:', tableInfo.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
      
      // Check if reservoir_id column exists and its data type
      const reservoirIdColumn = tableInfo.rows.find(r => r.column_name === 'reservoir_id');
      if (!reservoirIdColumn) {
        throw new Error('reservoir_id column not found in reservoir_locations table');
      }
      
      // Determine if reservoir_id is integer or string
      const isReservoirIdInteger = reservoirIdColumn.data_type.includes('int');
      console.log(`[ReservoirLocationsImport] reservoir_id is ${isReservoirIdInteger ? 'integer' : 'string'} type`);
      
      // Read Excel file
      const excelFilePath = path.join(rootDir, 'reservior (tumbon code).xlsx');
      console.log(`[ReservoirLocationsImport] Reading Excel file from: ${excelFilePath}`);
      
      if (!fs.existsSync(excelFilePath)) {
        console.error(`[ReservoirLocationsImport] Excel file not found at: ${excelFilePath}`);
        return { success: false, error: 'Excel file not found' };
      }
      
      const workbook = xlsx.readFile(excelFilePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      console.log(`[ReservoirLocationsImport] Found ${data.length} records in Excel file`);
      
      // Process in smaller batches to avoid long-running transactions
      const batchSize = 10;
      let insertedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        console.log(`[ReservoirLocationsImport] Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(data.length/batchSize)}`);
        
        // Begin transaction for this batch
        await client.query('BEGIN');
        
        try {
          // Process each row in the batch
          for (const row of batch) {
            try {
              // Extract data from Excel row
              let reservoirId = row.cresv?.toString() || '';
              const reservoirName = row.nresv || '';
              const reservoirLat = parseFloat(row.cresv_lat) || null;
              const reservoirLong = parseFloat(row.cresv_lng) || null;
              const agencyId = parseInt(row.project_id) || null;
              
              // Skip rows without required data
              if (!reservoirId || !reservoirName) {
                console.warn(`[ReservoirLocationsImport] Skipping row with missing required data:`, row);
                continue;
              }
              
              // Convert reservoirId to integer if needed
              if (isReservoirIdInteger) {
                // Extract numeric part if it's in format like 'rsv01'
                const numericPart = reservoirId.replace(/\D/g, '');
                if (numericPart) {
                  reservoirId = parseInt(numericPart);
                } else {
                  console.warn(`[ReservoirLocationsImport] Skipping row with non-numeric ID: ${reservoirId}`);
                  continue;
                }
              }
              
              // Check if reservoir exists
              const reservoirCheck = await client.query(
                'SELECT reservoir_id FROM reservoir_locations WHERE reservoir_id = $1',
                [reservoirId]
              );
              
              if (reservoirCheck.rows.length === 0) {
                // Insert new reservoir location
                await client.query(`
                  INSERT INTO reservoir_locations (
                    reservoir_id,
                    reservoir_name,
                    reservoir_lat,
                    reservoir_long,
                    agency_id,
                    created_at,
                    updated_at,
                    data_source
                  ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 'excel')
                `, [
                  reservoirId,
                  reservoirName,
                  reservoirLat,
                  reservoirLong,
                  agencyId
                ]);
                
                insertedCount++;
                console.log(`[ReservoirLocationsImport] Inserted reservoir: ${reservoirId} - ${reservoirName}`);
              } else {
                // Update existing reservoir location
                await client.query(`
                  UPDATE reservoir_locations SET
                    reservoir_name = $2,
                    reservoir_lat = $3,
                    reservoir_long = $4,
                    agency_id = $5,
                    updated_at = NOW(),
                    data_source = 'excel'
                  WHERE reservoir_id = $1
                `, [
                  reservoirId,
                  reservoirName,
                  reservoirLat,
                  reservoirLong,
                  agencyId
                ]);
                
                updatedCount++;
                console.log(`[ReservoirLocationsImport] Updated reservoir: ${reservoirId} - ${reservoirName}`);
              }
            } catch (rowError) {
              // Log error but continue with other rows in the batch
              errorCount++;
              console.error('[ReservoirLocationsImport] Error processing row', {
                row,
                error: rowError instanceof Error ? rowError.message : String(rowError)
              });
            }
          }
          
          // Commit transaction for this batch
          await client.query('COMMIT');
          console.log(`[ReservoirLocationsImport] Batch ${Math.floor(i/batchSize) + 1} committed successfully`);
          
        } catch (batchError) {
          // Rollback transaction for this batch
          await client.query('ROLLBACK');
          console.error(`[ReservoirLocationsImport] Error processing batch ${Math.floor(i/batchSize) + 1}`, {
            error: batchError instanceof Error ? batchError.message : String(batchError),
            stack: batchError instanceof Error ? batchError.stack : undefined
          });
          errorCount += batch.length;
        }
      }
      
      console.log('[ReservoirLocationsImport] Import completed', {
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount
      });
      
      return {
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ReservoirLocationsImport] Import failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importReservoirLocations()
  .then((result) => {
    console.log('[ReservoirLocationsImport] Import process completed successfully', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ReservoirLocationsImport] Import process failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 