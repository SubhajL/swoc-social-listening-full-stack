import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../');

/**
 * Imports reservoir data from Excel file into PostgreSQL
 */
async function importReservoirExcel() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[ReservoirImport] Starting import from Excel file');

  try {
    // Read Excel file
    const excelFilePath = path.join(rootDir, 'reservoir.xlsx');
    logger.info(`[ReservoirImport] Reading Excel file from: ${excelFilePath}`);
    
    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    logger.info(`[ReservoirImport] Found ${data.length} records in Excel file`);
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Process each row
      let insertedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const row of data) {
        try {
          // Extract data from Excel row
          const stationId = row.id?.toString() || '';
          const stationName = row.name || '';
          const stationNameTh = row.name_th || '';
          const owner = row.owner || '';
          const capacity = parseFloat(row.capacity) || 0;
          const region = row.region || '';
          const stationType = row.type || 'dam'; // Default to 'dam' if not specified
          
          // Check if station exists
          const stationCheck = await client.query(
            'SELECT tele_station_id FROM reservoir_stations WHERE tele_station_id = $1',
            [stationId]
          );
          
          if (stationCheck.rows.length === 0) {
            // Insert new station
            await client.query(`
              INSERT INTO reservoir_stations (
                tele_station_id,
                tele_station_name,
                tele_station_name_th,
                owner,
                capacity,
                region,
                station_type,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            `, [
              stationId,
              stationName,
              stationNameTh,
              owner,
              capacity,
              region,
              stationType
            ]);
            
            insertedCount++;
            logger.info(`[ReservoirImport] Inserted station: ${stationId} - ${stationName}`);
          } else {
            // Update existing station
            await client.query(`
              UPDATE reservoir_stations SET
                tele_station_name = $2,
                tele_station_name_th = $3,
                owner = $4,
                capacity = $5,
                region = $6,
                station_type = $7,
                updated_at = NOW()
              WHERE tele_station_id = $1
            `, [
              stationId,
              stationName,
              stationNameTh,
              owner,
              capacity,
              region,
              stationType
            ]);
            
            updatedCount++;
            logger.info(`[ReservoirImport] Updated station: ${stationId} - ${stationName}`);
          }
        } catch (rowError) {
          errorCount++;
          logger.error('[ReservoirImport] Error processing row', {
            row,
            error: rowError instanceof Error ? rowError.message : String(rowError)
          });
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      logger.info('[ReservoirImport] Import completed', {
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
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[ReservoirImport] Error during import', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[ReservoirImport] Import failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importReservoirExcel()
  .then((result) => {
    logger.info('[ReservoirImport] Import process completed successfully', result);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[ReservoirImport] Import process failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 