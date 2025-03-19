import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// API endpoints
const DAM_API_URL = 'https://app.rid.go.th/reservoir/api/dam/public';
const RESERVOIR_API_URL = 'https://app.rid.go.th/reservoir/api/reservoir/public';

/**
 * Fetches data from the dam API
 */
async function fetchDamData() {
  try {
    logger.info('[ReservoirSync] Fetching data from dam API');
    const response = await fetch(DAM_API_URL);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    logger.info(`[ReservoirSync] Fetched data for ${data.total} dams`);
    return data;
  } catch (error) {
    logger.error('[ReservoirSync] Error fetching dam data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Fetches data from the reservoir API
 */
async function fetchReservoirData() {
  try {
    logger.info('[ReservoirSync] Fetching data from reservoir API');
    const response = await fetch(RESERVOIR_API_URL);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    logger.info(`[ReservoirSync] Fetched data for ${data.total} reservoirs`);
    return data;
  } catch (error) {
    logger.error('[ReservoirSync] Error fetching reservoir data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Processes dam data and inserts/updates records in the database
 */
async function processDamData(client, damData) {
  try {
    const date = damData.date;
    const formattedDate = date.split('T')[0]; // Extract YYYY-MM-DD
    
    logger.info(`[ReservoirSync] Processing dam data for date: ${formattedDate}`);
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each region
    for (const region of damData.data) {
      const regionName = region.region;
      
      // Process each dam in the region
      for (const dam of region.dam) {
        try {
          const apiStationId = dam.id;
          const stationName = dam.name;
          
          // Convert empty strings or undefined to null for numeric fields
          const inflow = dam.inflow === '' || dam.inflow === undefined ? null : dam.inflow;
          const outflow = dam.outflow === '' || dam.outflow === undefined ? null : dam.outflow;
          const storage = dam.storage === '' || dam.storage === undefined ? null : dam.storage;
          const deadStorage = dam.dead_storage === '' || dam.dead_storage === undefined ? null : dam.dead_storage;
          const volume = dam.volume === '' || dam.volume === undefined ? null : dam.volume;
          
          logger.info(`[ReservoirSync] Processing dam: ${stationName} (ID: ${apiStationId})`);
          
          // Check if data for this dam and date already exists
          const dataCheck = await client.query(
            'SELECT id FROM reservoir_data WHERE reservoir_id = $1 AND date = $2',
            [apiStationId, formattedDate]
          );
          
          if (dataCheck.rows.length === 0) {
            // Insert new data
            logger.info(`[ReservoirSync] Inserting new data for dam ${stationName} (ID=${apiStationId})`);
            logger.info(`[ReservoirSync] Data values: storage=${storage}, dead_storage=${deadStorage}, volume=${volume}, inflow=${inflow}, outflow=${outflow}`);
            
            await client.query(`
              INSERT INTO reservoir_data (
                reservoir_id,
                reservoir_name,
                storage,
                dead_storage,
                volume,
                inflow,
                outflow,
                date,
                type,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            `, [
              apiStationId,
              stationName,
              storage,
              deadStorage,
              volume,
              inflow,
              outflow,
              formattedDate,
              'dam'
            ]);
            
            insertedCount++;
          } else {
            // Update existing data
            await client.query(`
              UPDATE reservoir_data SET
                storage = $2,
                dead_storage = $3,
                volume = $4,
                inflow = $5,
                outflow = $6,
                updated_at = NOW()
              WHERE reservoir_id = $1 AND date = $7
            `, [
              apiStationId,
              storage,
              deadStorage,
              volume,
              inflow,
              outflow,
              formattedDate
            ]);
            
            updatedCount++;
          }
        } catch (damError) {
          errorCount++;
          logger.error('[ReservoirSync] Error processing dam', {
            dam: dam.name,
            error: damError instanceof Error ? damError.message : String(damError)
          });
        }
      }
    }
    
    logger.info('[ReservoirSync] Dam data processing completed', {
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount
    });
    
    return { insertedCount, updatedCount, errorCount };
  } catch (error) {
    logger.error('[ReservoirSync] Error processing dam data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Processes reservoir data and inserts/updates records in the database
 */
async function processReservoirData(client, reservoirData) {
  try {
    const date = reservoirData.date;
    const formattedDate = date.split('T')[0]; // Extract YYYY-MM-DD
    
    logger.info(`[ReservoirSync] Processing reservoir data for date: ${formattedDate}`);
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each region
    for (const region of reservoirData.data) {
      const regionName = region.region;
      
      // Process each reservoir in the region
      for (const reservoir of region.reservoir) {
        try {
          const apiStationId = reservoir.id;
          const stationName = reservoir.name;
          
          // Convert empty strings or undefined to null for numeric fields
          const inflow = reservoir.inflow === '' || reservoir.inflow === undefined ? null : reservoir.inflow;
          const outflow = reservoir.outflow === '' || reservoir.outflow === undefined ? null : reservoir.outflow;
          const storage = reservoir.storage === '' || reservoir.storage === undefined ? null : reservoir.storage;
          const deadStorage = reservoir.dead_storage === '' || reservoir.dead_storage === undefined ? null : reservoir.dead_storage;
          const volume = reservoir.volume === '' || reservoir.volume === undefined ? null : reservoir.volume;
          
          logger.info(`[ReservoirSync] Processing reservoir: ${stationName} (ID: ${apiStationId})`);
          
          // Check if data for this reservoir and date already exists
          const dataCheck = await client.query(
            'SELECT id FROM reservoir_data WHERE reservoir_id = $1 AND date = $2',
            [apiStationId, formattedDate]
          );
          
          if (dataCheck.rows.length === 0) {
            // Insert new data
            logger.info(`[ReservoirSync] Inserting new data for reservoir ${stationName} (ID=${apiStationId})`);
            logger.info(`[ReservoirSync] Data values: storage=${storage}, dead_storage=${deadStorage}, volume=${volume}, inflow=${inflow}, outflow=${outflow}`);
            
            await client.query(`
              INSERT INTO reservoir_data (
                reservoir_id,
                reservoir_name,
                storage,
                dead_storage,
                volume,
                inflow,
                outflow,
                date,
                type,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            `, [
              apiStationId,
              stationName,
              storage,
              deadStorage,
              volume,
              inflow,
              outflow,
              formattedDate,
              'reservoir'
            ]);
            
            insertedCount++;
          } else {
            // Update existing data
            await client.query(`
              UPDATE reservoir_data SET
                storage = $2,
                dead_storage = $3,
                volume = $4,
                inflow = $5,
                outflow = $6,
                updated_at = NOW()
              WHERE reservoir_id = $1 AND date = $7
            `, [
              apiStationId,
              storage,
              deadStorage,
              volume,
              inflow,
              outflow,
              formattedDate
            ]);
            
            updatedCount++;
          }
        } catch (reservoirError) {
          errorCount++;
          logger.error('[ReservoirSync] Error processing reservoir', {
            reservoir: reservoir.name,
            error: reservoirError instanceof Error ? reservoirError.message : String(reservoirError)
          });
        }
      }
    }
    
    logger.info('[ReservoirSync] Reservoir data processing completed', {
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount
    });
    
    return { insertedCount, updatedCount, errorCount };
  } catch (error) {
    logger.error('[ReservoirSync] Error processing reservoir data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Main function to sync reservoir data
 */
async function syncReservoirData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  logger.info('[ReservoirSync] Starting reservoir data sync');
  
  try {
    // Fetch data from APIs
    const [damData, reservoirData] = await Promise.all([
      fetchDamData(),
      fetchReservoirData()
    ]);
    
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Process dam data
      const damResult = await processDamData(client, damData);
      
      // Process reservoir data
      const reservoirResult = await processReservoirData(client, reservoirData);
      
      // Commit transaction
      await client.query('COMMIT');
      
      logger.info('[ReservoirSync] Data sync completed successfully', {
        dam: damResult,
        reservoir: reservoirResult
      });
      
      return {
        success: true,
        dam: damResult,
        reservoir: reservoirResult
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[ReservoirSync] Error during data sync', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('[ReservoirSync] Data sync failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the sync
syncReservoirData()
  .then((result) => {
    logger.info('[ReservoirSync] Sync process completed successfully', result);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[ReservoirSync] Sync process failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }); 