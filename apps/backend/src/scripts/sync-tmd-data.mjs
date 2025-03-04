// Script to sync TMD data from API to database
import pg from 'pg';
import dotenv from 'dotenv';
import winston from 'winston';
import axios from 'axios';

const { Pool } = pg;
const { createLogger, format, transports } = winston;

// Load environment variables
dotenv.config();

// Create logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console()
  ]
});

// API configuration for TMD
const THAIWATER_API_ENDPOINT = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/api_service';

// TMD station data
const TMD_STATION_API_MID = '264';
const TMD_STATION_API_EID = 'skbNrh269YFK3TOaTT7074F_kQKPqfo0Ji_UkABKAnbLZiK_ceQ6ii0zx6HsLGOsYbMRu5Ll6d4wrpZ9jB7SHA';

// TMD rainfall data
const TMD_RAINFALL_API_MID = '244';
const TMD_RAINFALL_API_EID = '45I5Oul2YvQ-W-pSmo4z05m_XNRQyS7vl-fTKR2KEUkkvFjoAvQ2KoIsoo7rJFzbkJ2MTom3WYYx54t1YAqurw';

/**
 * Fetches TMD station data from ThaiWater API
 */
async function getTMDStationInfo() {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_STATION_API_MID}&eid=${encodeURIComponent(TMD_STATION_API_EID)}`;
    
    logger.info('[TMDService] Making API request for station information', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('[TMDService] Station information API response', {
      totalStations: response.data.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data,
      debug: {
        totalStations: response.data.length
      }
    };

  } catch (error) {
    const errorResponse = error?.response;
    
    logger.error('[TMDService] Station information API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch TMD station information: ${error instanceof Error ? error.message : String(error)}`,
      debug: {
        status: errorResponse?.status,
        data: errorResponse?.data
      }
    };
  }
}

/**
 * Fetches TMD rainfall data from ThaiWater API
 */
async function getTMDRainfallData() {
  try {
    const url = `${THAIWATER_API_ENDPOINT}?mid=${TMD_RAINFALL_API_MID}&eid=${encodeURIComponent(TMD_RAINFALL_API_EID)}`;
    
    logger.info('[TMDService] Making API request for rainfall data', {
      url,
      timestamp: new Date().toISOString()
    });

    const response = await axios.get(url);
    
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected array');
    }

    logger.info('[TMDService] Rainfall data API response', {
      totalRecords: response.data.length,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      data: response.data,
      debug: {
        totalRecords: response.data.length
      }
    };

  } catch (error) {
    const errorResponse = error?.response;
    
    logger.error('[TMDService] Rainfall data API request failed', {
      error: error instanceof Error ? error.message : String(error),
      status: errorResponse?.status,
      statusText: errorResponse?.statusText,
      data: errorResponse?.data,
      timestamp: new Date().toISOString()
    });

    return {
      success: false,
      data: [],
      error: `Failed to fetch TMD rainfall data: ${error instanceof Error ? error.message : String(error)}`,
      debug: {
        status: errorResponse?.status,
        data: errorResponse?.data
      }
    };
  }
}

/**
 * Syncs TMD data from API to database
 */
async function syncTMDData(pool) {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    logger.info('[TMDSync] Starting data sync from TMD API');
    
    // First, check if the data_source column exists in both tables
    const checkStationsColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'thaiwater_tele_stations' 
      AND column_name = 'data_source'
    `);
    
    const checkRainfallColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'thaiwater_rainfall_data' 
      AND column_name = 'data_source'
    `);
    
    const checkRainfall3hColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'thaiwater_rainfall_data' 
      AND column_name = 'rainfall3h'
    `);
    
    // If any required column is missing, add it
    if (checkStationsColumn.rows.length === 0) {
      logger.info('[TMDSync] Adding data_source column to thaiwater_tele_stations');
      await client.query(`
        ALTER TABLE thaiwater_tele_stations 
        ADD COLUMN data_source VARCHAR(10)
      `);
      
      // Update existing records to set data_source = 'HII'
      await client.query(`
        UPDATE thaiwater_tele_stations 
        SET data_source = 'HII'
      `);
    }
    
    if (checkRainfallColumn.rows.length === 0) {
      logger.info('[TMDSync] Adding data_source column to thaiwater_rainfall_data');
      await client.query(`
        ALTER TABLE thaiwater_rainfall_data 
        ADD COLUMN data_source VARCHAR(10)
      `);
      
      // Update existing records to set data_source = 'HII'
      await client.query(`
        UPDATE thaiwater_rainfall_data 
        SET data_source = 'HII'
      `);
    }
    
    if (checkRainfall3hColumn.rows.length === 0) {
      logger.info('[TMDSync] Adding rainfall3h column to thaiwater_rainfall_data');
      await client.query(`
        ALTER TABLE thaiwater_rainfall_data 
        ADD COLUMN rainfall3h DECIMAL(10, 2)
      `);
    }
    
    // Fetch station data from TMD API
    const stationResponse = await getTMDStationInfo();
    
    if (!stationResponse.success || !Array.isArray(stationResponse.data) || stationResponse.data.length === 0) {
      throw new Error(`Failed to fetch TMD station data: ${stationResponse.error}`);
    }
    
    const stations = stationResponse.data;
    logger.info(`[TMDSync] Fetched ${stations.length} TMD stations`);
    
    // Process each station
    let stationsProcessed = 0;
    let stationsInserted = 0;
    let stationsUpdated = 0;
    
    for (const station of stations) {
      try {
        const query = `
          INSERT INTO thaiwater_tele_stations (
            tele_station_id,
            tele_station_name,
            tele_station_name_th,
            tele_station_oldcode,
            tele_station_lat,
            tele_station_long,
            agency_id,
            data_source,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (tele_station_id) 
          DO UPDATE SET
            tele_station_name = EXCLUDED.tele_station_name,
            tele_station_name_th = EXCLUDED.tele_station_name_th,
            tele_station_oldcode = EXCLUDED.tele_station_oldcode,
            tele_station_lat = EXCLUDED.tele_station_lat,
            tele_station_long = EXCLUDED.tele_station_long,
            agency_id = EXCLUDED.agency_id,
            data_source = EXCLUDED.data_source,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `;
        
        const values = [
          station.id,
          station.tele_station_name.en || '',
          station.tele_station_name.th,
          station.tele_station_oldcode,
          parseFloat(station.tele_station_lat),
          parseFloat(station.tele_station_long),
          station.agency_id,
          'TMD'
        ];
        
        const result = await client.query(query, values);
        
        if (result.rows[0].inserted) {
          stationsInserted++;
        } else {
          stationsUpdated++;
        }
        
        stationsProcessed++;
        
        if (stationsProcessed % 100 === 0) {
          logger.info(`[TMDSync] Processed ${stationsProcessed}/${stations.length} TMD stations`);
        }
      } catch (error) {
        logger.error(`[TMDSync] Error processing station ID ${station.id}:`, error);
        // Continue with the next station
      }
    }
    
    logger.info(`[TMDSync] Completed processing ${stationsProcessed} TMD stations (inserted: ${stationsInserted}, updated: ${stationsUpdated})`);
    
    // Fetch rainfall data from TMD API
    const rainfallResponse = await getTMDRainfallData();
    
    if (!rainfallResponse.success || !Array.isArray(rainfallResponse.data)) {
      logger.warn(`[TMDSync] Failed to fetch TMD rainfall data: ${rainfallResponse.error}`);
      // Continue with the transaction even if rainfall data fetch fails
    } else {
      const rainfallData = rainfallResponse.data;
      logger.info(`[TMDSync] Fetched ${rainfallData.length} TMD rainfall records`);
      
      // Process each rainfall record
      let rainfallProcessed = 0;
      let rainfallInserted = 0;
      let rainfallUpdated = 0;
      let rainfallSkipped = 0;
      
      for (const rainfall of rainfallData) {
        try {
          // Check if the station exists in our database
          const stationCheck = await client.query(
            'SELECT tele_station_id FROM thaiwater_tele_stations WHERE tele_station_id = $1',
            [rainfall.tele_station_id]
          );
          
          if (stationCheck.rows.length === 0) {
            logger.warn(`[TMDSync] Skipping rainfall data for unknown station ID: ${rainfall.tele_station_id}`);
            rainfallSkipped++;
            continue;
          }
          
          // Check if a record already exists for this station and datetime
          const checkQuery = `
            SELECT id FROM thaiwater_rainfall_data 
            WHERE tele_station_id = $1 AND rainfall_datetime = $2
          `;
          
          const checkResult = await client.query(checkQuery, [
            rainfall.tele_station_id,
            rainfall.rainfall_datetime
          ]);
          
          if (checkResult.rows.length > 0) {
            // Update existing record
            const updateQuery = `
              UPDATE thaiwater_rainfall_data SET
                rainfall24h = $1,
                rainfall3h = $2,
                data_source = $3,
                updated_at = NOW()
              WHERE tele_station_id = $4 AND rainfall_datetime = $5
            `;
            
            await client.query(updateQuery, [
              rainfall.rainfall24h,
              rainfall.rainfall3h,
              'TMD',
              rainfall.tele_station_id,
              rainfall.rainfall_datetime
            ]);
            
            rainfallUpdated++;
          } else {
            // Insert new record
            const insertQuery = `
              INSERT INTO thaiwater_rainfall_data (
                tele_station_id,
                rainfall24h,
                rainfall3h,
                rainfall_datetime,
                data_source
              ) VALUES ($1, $2, $3, $4, $5)
            `;
            
            await client.query(insertQuery, [
              rainfall.tele_station_id,
              rainfall.rainfall24h,
              rainfall.rainfall3h,
              rainfall.rainfall_datetime,
              'TMD'
            ]);
            
            rainfallInserted++;
          }
          
          rainfallProcessed++;
          
          if (rainfallProcessed % 50 === 0) {
            logger.info(`[TMDSync] Processed ${rainfallProcessed}/${rainfallData.length} TMD rainfall records`);
          }
        } catch (error) {
          logger.error(`[TMDSync] Error processing rainfall data for station ID ${rainfall.tele_station_id}:`, error);
          // Continue with the next rainfall record
        }
      }
      
      logger.info(`[TMDSync] Completed processing ${rainfallProcessed} TMD rainfall records (inserted: ${rainfallInserted}, updated: ${rainfallUpdated}, skipped: ${rainfallSkipped})`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('[TMDSync] Data sync completed successfully');
    
    return {
      success: true,
      message: 'Successfully synced TMD data'
    };
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[TMDSync] Error syncing data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Failed to sync TMD data',
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    // Release client back to pool
    client.release();
  }
}

/**
 * Main function to run the TMD data sync
 */
async function runTMDSync() {
  logger.info('[TMDSync] Starting TMD data sync task', {
    timestamp: new Date().toISOString()
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await syncTMDData(pool);
    
    if (result.success) {
      logger.info('[TMDSync] TMD data sync completed successfully', {
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('[TMDSync] TMD data sync failed', {
        error: result.error,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('[TMDSync] Error running TMD data sync task', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  } finally {
    await pool.end();
  }
}

// Run the sync task
runTMDSync()
  .then(() => {
    console.log('TMD data sync task completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running TMD data sync task:', error);
    process.exit(1);
  }); 