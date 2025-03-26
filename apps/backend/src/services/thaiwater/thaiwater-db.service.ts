import { Pool } from 'pg';
import { logger } from '../../utils/logger';
import { getRainfallData } from './thaiwater.service';

// Extended interface for ThaiWater station data
interface ThaiWaterTeleStation {
  tele_station_id: number;
  tele_station_name: string;
  tele_station_name_th: string;
  tele_station_oldcode: string;
  tele_station_lat: number;
  tele_station_long: number;
  tele_station_type: string;
  agency_id: number;
  ground_level: number;
  left_bank: number;
  right_bank: number;
  is_warning: string;
  province?: string;
  amphure?: string;
  tambon?: string;
  rainfall_values?: ThaiWaterRainfallValue[];
}

// Interface for rainfall values
interface ThaiWaterRainfallValue {
  rainfall10m: number;
  rainfall1h: number;
  rainfall24h: number;
  rainfall_datetime: string;
}

/**
 * Syncs data from ThaiWater API to the database
 */
export async function syncThaiWaterData(pool: Pool): Promise<{ success: boolean; message: string; error?: any }> {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    logger.info('[ThaiWaterDB] Starting data sync from ThaiWater API');
    
    // Fetch data from ThaiWater API
    const apiResponse = await getRainfallData();
    
    if (!apiResponse.success || !apiResponse.data) {
      throw new Error(`Failed to fetch data from ThaiWater API: ${apiResponse.error}`);
    }
    
    const teleStations = apiResponse.data as unknown as ThaiWaterTeleStation[];
    logger.info(`[ThaiWaterDB] Processing ${teleStations.length} telemetry stations`);
    
    // Process each telemetry station
    for (const station of teleStations) {
      // Skip stations without valid ID
      if (!station.tele_station_id) {
        logger.warn('[ThaiWaterDB] Skipping station with missing ID', {
          station_name: station.tele_station_name
        });
        continue;
      }
      
      // Upsert telemetry station
      await upsertTeleStation(client, station);
      
      // Insert rainfall data if available
      if (station.rainfall_values && station.rainfall_values.length > 0) {
        for (const rainfallData of station.rainfall_values) {
          if (rainfallData.rainfall_datetime) {
            await insertRainfallData(client, station.tele_station_id, rainfallData);
          }
        }
      } else {
        logger.warn('[ThaiWaterDB] No rainfall data for station', {
          station_id: station.tele_station_id,
          station_name: station.tele_station_name
        });
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('[ThaiWaterDB] Data sync completed successfully', {
      stations_processed: teleStations.length
    });
    
    return {
      success: true,
      message: `Successfully synced ${teleStations.length} telemetry stations`
    };
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[ThaiWaterDB] Error syncing data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Failed to sync ThaiWater data',
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    // Release client back to pool
    client.release();
  }
}

/**
 * Upserts a telemetry station into the database
 */
async function upsertTeleStation(client: any, station: ThaiWaterTeleStation): Promise<void> {
  const {
    tele_station_id,
    tele_station_name,
    tele_station_name_th,
    tele_station_oldcode,
    tele_station_lat,
    tele_station_long,
    tele_station_type,
    agency_id,
    ground_level,
    left_bank,
    right_bank,
    is_warning,
    province,
    amphure,
    tambon
  } = station;
  
  // Use upsert pattern with ON CONFLICT for better efficiency
  await client.query(`
    INSERT INTO thaiwater_tele_stations (
      tele_station_id,
      tele_station_name,
      tele_station_name_th,
      tele_station_oldcode,
      tele_station_lat,
      tele_station_long,
      tele_station_type,
      agency_id,
      ground_level,
      left_bank,
      right_bank,
      is_warning,
      province,
      amphure,
      tambon,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
    ON CONFLICT (tele_station_id) DO UPDATE SET
      tele_station_name = EXCLUDED.tele_station_name,
      tele_station_name_th = EXCLUDED.tele_station_name_th,
      tele_station_oldcode = EXCLUDED.tele_station_oldcode,
      tele_station_lat = EXCLUDED.tele_station_lat,
      tele_station_long = EXCLUDED.tele_station_long,
      tele_station_type = EXCLUDED.tele_station_type,
      agency_id = EXCLUDED.agency_id,
      ground_level = EXCLUDED.ground_level,
      left_bank = EXCLUDED.left_bank,
      right_bank = EXCLUDED.right_bank,
      is_warning = EXCLUDED.is_warning,
      province = EXCLUDED.province,
      amphure = EXCLUDED.amphure,
      tambon = EXCLUDED.tambon,
      updated_at = NOW()
  `, [
    tele_station_id,
    tele_station_name,
    tele_station_name_th,
    tele_station_oldcode,
    tele_station_lat,
    tele_station_long,
    tele_station_type,
    agency_id,
    ground_level,
    left_bank,
    right_bank,
    is_warning === 'Y', // Convert 'Y'/'N' to boolean
    province,
    amphure,
    tambon
  ]);
  
  logger.info('[ThaiWaterDB] Upserted telemetry station', {
    station_id: tele_station_id,
    name: tele_station_name
  });
}

/**
 * Inserts or updates rainfall data for a telemetry station
 */
async function insertRainfallData(client: any, stationId: number, rainfallData: ThaiWaterRainfallValue): Promise<void> {
  const { rainfall10m, rainfall1h, rainfall24h, rainfall_datetime } = rainfallData;
  
  // Skip if missing datetime
  if (!rainfall_datetime) {
    logger.warn(`[ThaiWaterDB] Skipping record with missing datetime for station ${stationId}`);
    return;
  }
  
  // Use upsert pattern with ON CONFLICT for better efficiency
  await client.query(`
    INSERT INTO thaiwater_rainfall_data (
      tele_station_id,
      rainfall10m,
      rainfall1h,
      rainfall24h,
      rainfall_datetime,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (tele_station_id, rainfall_datetime) DO UPDATE SET
      rainfall10m = EXCLUDED.rainfall10m,
      rainfall1h = EXCLUDED.rainfall1h,
      rainfall24h = EXCLUDED.rainfall24h,
      updated_at = NOW()
  `, [
    stationId,
    rainfall10m,
    rainfall1h,
    rainfall24h,
    rainfall_datetime
  ]);
}

/**
 * Gets the latest rainfall data for a specific station
 */
export async function getLatestRainfallData(stationId: number, pool: Pool): Promise<any> {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        s.tele_station_name,
        s.tele_station_name_th,
        s.tele_station_lat,
        s.tele_station_long,
        s.province,
        s.amphure,
        s.tambon
      FROM thaiwater_rainfall_data r
      JOIN thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE r.tele_station_id = $1
      ORDER BY r.rainfall_datetime DESC
      LIMIT 1
    `, [stationId]);
    
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error('[ThaiWaterDB] Error fetching latest rainfall data', {
      station_id: stationId,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}

/**
 * Gets rainfall data by location (amphure or province)
 */
export async function getRainfallDataByLocation(
  amphure?: string,
  province?: string,
  pool?: Pool
): Promise<any[]> {
  if (!pool) {
    throw new Error('Database pool is required');
  }
  
  try {
    let query = `
      SELECT 
        r.*,
        s.tele_station_name,
        s.tele_station_name_th,
        s.tele_station_lat,
        s.tele_station_long,
        s.province,
        s.amphure,
        s.tambon
      FROM thaiwater_rainfall_data_new r
      JOIN thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (amphure) {
      params.push(amphure);
      query += ` AND s.amphure = $${params.length}`;
    }
    
    if (province) {
      params.push(province);
      query += ` AND s.province = $${params.length}`;
    }
    
    // Get only the latest data for each station
    query += `
      AND r.rainfall_datetime = (
        SELECT MAX(rainfall_datetime)
        FROM thaiwater_rainfall_data_new
        WHERE tele_station_id = r.tele_station_id
      )
    `;
    
    const result = await pool.query(query, params);
    
    return result.rows;
    
  } catch (error) {
    logger.error('[ThaiWaterDB] Error fetching rainfall data by location', {
      amphure,
      province,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}

/**
 * Updates station location information
 */
export async function updateStationLocation(
  stationId: number,
  locationData: { province?: string; amphure?: string; tambon?: string },
  pool: Pool
): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { province, amphure, tambon } = locationData;
    
    // Build the update query dynamically based on provided fields
    let query = 'UPDATE thaiwater_tele_stations SET updated_at = NOW()';
    const params: any[] = [];
    
    if (province) {
      params.push(province);
      query += `, province = $${params.length}`;
    }
    
    if (amphure) {
      params.push(amphure);
      query += `, amphure = $${params.length}`;
    }
    
    if (tambon) {
      params.push(tambon);
      query += `, tambon = $${params.length}`;
    }
    
    // Add the WHERE clause
    params.push(stationId);
    query += ` WHERE tele_station_id = $${params.length}`;
    
    // Execute the update
    const result = await client.query(query, params);
    
    await client.query('COMMIT');
    
    return result.rowCount ? result.rowCount > 0 : false;
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    logger.error('[ThaiWaterDB] Error updating station location', {
      station_id: stationId,
      location_data: locationData,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
    
  } finally {
    client.release();
  }
} 