import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
 * Updates reservoir locations in PostgreSQL and exports to JSON
 */
async function updateAndExportReservoirLocations() {
  console.log('[ReservoirLocationsUpdate] Starting update and export');

  try {
    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      // 1. Check if formatted_id column exists, if not create it
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'reservoir_locations' AND column_name = reservoir_id `);
      
      if (columnCheck.rows.length === 0) {
        console.log('[ReservoirLocationsUpdate] Adding formatted_id column');
        await client.query(`
          ALTER TABLE reservoir_locations 
          ADD COLUMN formatted_id VARCHAR(10)
        `);
      }
      
      // 2. Get all reservoir records
      const getResult = await client.query('SELECT * FROM reservoir_locations ORDER BY reservoir_id');
      console.log(`[ReservoirLocationsUpdate] Found ${getResult.rows.length} records to update`);
      
      let updatedCount = 0;
      
      // 3. Process each record
      for (const record of getResult.rows) {
        try {
          // Format reservoir_id with 'rsv' prefix and zero-padding for single digits
          const numericId = record.reservoir_id;
          const formattedId = numericId < 10 ? `rsv0${numericId}` : `rsv${numericId}`;
          
          // Update the record
          await client.query(`
            UPDATE reservoir_locations 
            SET 
              formatted_id = $1,
              reservoir_name_ = NULL,
              updated_at = NOW()
            WHERE reservoir_id = $2
          `, [formattedId, numericId]);
          
          updatedCount++;
          
          if (updatedCount % 50 === 0) {
            console.log(`[ReservoirLocationsUpdate] Updated ${updatedCount} records so far`);
          }
        } catch (recordError) {
          console.error(`[ReservoirLocationsUpdate] Error updating record ID ${record.reservoir_id}:`, recordError.message);
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log(`[ReservoirLocationsUpdate] Successfully updated ${updatedCount} records`);
      
      // 4. Export updated data to JSON with formatted_id as reservoir_id in the output
      const exportResult = await client.query(`
        SELECT reservoir_id AS reservoir_id,
          reservoir_name,
          reservoir_name_,
          reservoir_lat,
          reservoir_long,
          agency_id,
          ground_level,
          left_bank,
          right_bank,
          is_warning,
          province,
          amphure,
          tambon,
          created_at,
          updated_at,
          data_source
        FROM reservoir_locations 
        ORDER BY reservoir_id
      `);
      
      // Save to file
      const outputPath = path.join(rootDir, 'updated_reservoir_locations.json');
      fs.writeFileSync(outputPath, JSON.stringify(exportResult.rows, null, 2));
      
      console.log(`[ReservoirLocationsUpdate] Saved updated data to ${outputPath}`);
      
      return {
        success: true,
        updatedCount,
        exportedCount: exportResult.rows.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ReservoirLocationsUpdate] Transaction failed, rolling back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[ReservoirLocationsUpdate] Update and export failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the update and export
updateAndExportReservoirLocations()
  .then((result) => {
    console.log('[ReservoirLocationsUpdate] Process completed successfully', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ReservoirLocationsUpdate] Process failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 