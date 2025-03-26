import { Pool } from 'pg';
import { logger } from '../../utils/logger';
import { getTMDStationInfo, getTMDRainfallData, TMDStationData, TMDRainfallData } from './tmd.service';

/**
 * Syncs TMD data from API to database
 */
export async function syncTMDData(pool: Pool): Promise<{ success: boolean; message: string; error?: any }> {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    logger.info('[TMDSync] Starting data sync from TMD API');
    
    // Fetch station data from TMD API
    const stationResponse = await getTMDStationInfo();
    
    if (!stationResponse.success || !Array.isArray(stationResponse.data) || stationResponse.data.length === 0) {
      throw new Error(`Failed to fetch TMD station data: ${stationResponse.error}`);
    }
    
    const stations = stationResponse.data as TMDStationData[];
    logger.info(`[TMDSync] Fetched ${stations.length} TMD stations`);
    
    // Process each station
    let stationsProcessed = 0;
    let stationsInserted = 0;
    let stationsUpdated = 0;
    
    for (const station of stations) {
      await upsertTMDStation(client, station);
      stationsProcessed++;
      
      if (stationsProcessed % 100 === 0) {
        logger.info(`[TMDSync] Processed ${stationsProcessed}/${stations.length} TMD stations`);
      }
    }
    
    logger.info(`[TMDSync] Completed processing ${stationsProcessed} TMD stations`);
    
    // Fetch rainfall data from TMD API
    const rainfallResponse = await getTMDRainfallData();
    
    if (!rainfallResponse.success || !Array.isArray(rainfallResponse.data)) {
      logger.warn(`[TMDSync] Failed to fetch TMD rainfall data: ${rainfallResponse.error}`);
      // Continue with the transaction even if rainfall data fetch fails
    } else {
      const rainfallData = rainfallResponse.data as TMDRainfallData[];
      logger.info(`[TMDSync] Fetched ${rainfallData.length} TMD rainfall records`);
      
      // Process each rainfall record
      let rainfallProcessed = 0;
      let rainfallInserted = 0;
      let rainfallUpdated = 0;
      let rainfallSkipped = 0;
      
      for (const rainfall of rainfallData) {
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
        
        await insertTMDRainfallData(client, rainfall);
        rainfallProcessed++;
        
        if (rainfallProcessed % 50 === 0) {
          logger.info(`[TMDSync] Processed ${rainfallProcessed}/${rainfallData.length} TMD rainfall records`);
        }
      }
      
      logger.info(`[TMDSync] Completed processing ${rainfallProcessed} TMD rainfall records (skipped: ${rainfallSkipped})`);
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
 * Inserts or updates a TMD station in the database
 */
async function upsertTMDStation(client: any, station: TMDStationData): Promise<void> {
  try {
    // Use upsert pattern with ON CONFLICT for better efficiency
    const query = `
      INSERT INTO thaiwater_tele_stations (
        tele_station_id,
        tele_station_name,
        tele_station_lat,
        tele_station_long,
        agency_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (tele_station_id) DO UPDATE SET
        tele_station_name = EXCLUDED.tele_station_name,
        tele_station_lat = EXCLUDED.tele_station_lat,
        tele_station_long = EXCLUDED.tele_station_long,
        agency_id = EXCLUDED.agency_id,
        updated_at = NOW()
    `;
    
    await client.query(query, [
      station.id, // Use id as tele_station_id
      station.tele_station_name.en || station.tele_station_name.th || '', // Use English name or fallback to Thai
      parseFloat(station.tele_station_lat),
      parseFloat(station.tele_station_long),
      station.agency_id
    ]);
    
    logger.info('[TMDSync] Upserted TMD station', {
      station_id: station.id,
      name: station.tele_station_name.en || station.tele_station_name.th || ''
    });
    
  } catch (error) {
    logger.error('[TMDSync] Error upserting TMD station', {
      error: error instanceof Error ? error.message : String(error),
      stationId: station.id
    });
    throw error;
  }
}

/**
 * Inserts or updates TMD rainfall data in the database
 */
async function insertTMDRainfallData(client: any, rainfallData: TMDRainfallData): Promise<void> {
  try {
    // Skip if missing required data
    if (!rainfallData.rainfall_datetime || !rainfallData.tele_station_id) {
      logger.warn('[TMDSync] Skipping TMD rainfall data with missing datetime or station ID', {
        stationId: rainfallData.tele_station_id,
        datetime: rainfallData.rainfall_datetime
      });
      return;
    }
    
    // Use upsert pattern with ON CONFLICT for better efficiency
    const query = `
      INSERT INTO thaiwater_rainfall_data (
        tele_station_id,
        rainfall24h,
        rainfall3h,
        rainfall_datetime,
        data_source,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (tele_station_id, rainfall_datetime) DO UPDATE SET
        rainfall24h = EXCLUDED.rainfall24h,
        rainfall3h = EXCLUDED.rainfall3h,
        data_source = EXCLUDED.data_source,
        updated_at = NOW()
    `;
    
    await client.query(query, [
      rainfallData.tele_station_id,
      rainfallData.rainfall24h,
      rainfallData.rainfall3h,
      rainfallData.rainfall_datetime,
      'TMD'
    ]);
    
  } catch (error) {
    logger.error('[TMDSync] Error inserting TMD rainfall data', {
      error: error instanceof Error ? error.message : String(error),
      stationId: rainfallData.tele_station_id,
      datetime: rainfallData.rainfall_datetime
    });
    throw error;
  }
} 