import { Pool, PoolClient } from 'pg';
import { logger } from '../../utils/logger';
import { getStationList } from '../../services/rid-telemetry/telemetry.service';
import { RIDStationResponse } from '../../types/rid-telemetry';

// Database connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'ec2-18-143-195-184.ap-southeast-1.compute.amazonaws.com',
  port: parseInt(process.env.POSTGRES_PORT || '15435'),
  user: process.env.POSTGRES_USER || 'swoc-uat-gis-ssl-user',
  password: process.env.POSTGRES_PASSWORD || '4c0b269f763d4ce1d1d59ba0e2ef1f9c',
  database: process.env.POSTGRES_DB || 'swoc-uat-gis-ssl',
  ssl: {
    rejectUnauthorized: false
  }
});

// Fields that should never be modified by the sync
const PROTECTED_FIELDS = ['province', 'amphure', 'tambon'];

// Field mapping between RID API response and database
interface StationFieldMapping {
  apiField: keyof RIDStationResponse;
  dbField: string;
  transform?: (value: any) => any;
}

const FIELD_MAPPINGS: StationFieldMapping[] = [
  { apiField: 'stationid', dbField: 'station_id' },
  { apiField: 'stationcode', dbField: 'station_code' },
  { apiField: 'stationname', dbField: 'station_name' },
  { apiField: 'stationdetail', dbField: 'station_detail' },
  { apiField: 'hydroid', dbField: 'hydro_id', transform: (v) => v ? parseInt(v, 10) : null },
  { apiField: 'hydroname', dbField: 'hydro_name' },
  { apiField: 'basinid', dbField: 'basin_id' },
  { apiField: 'basinname', dbField: 'basin_name' },
  { apiField: 'provincecode', dbField: 'province_code' },
  { apiField: 'latitude', dbField: 'latitude', transform: (v) => v ? parseFloat(v) : null },
  { apiField: 'longitude', dbField: 'longitude', transform: (v) => v ? parseFloat(v) : null },
  { apiField: 'GroundLevel', dbField: 'ground_level', transform: (v) => v ? parseFloat(v) : null },
  { apiField: 'QMax', dbField: 'q_max', transform: (v) => v ? parseFloat(v) : null },
  { apiField: 'ZG', dbField: 'zg', transform: (v) => v ? parseFloat(v) : null },
  { apiField: 'braelevel', dbField: 'brae_level', transform: (v) => v ? parseFloat(v) : null },
  { apiField: 'UseMSL', dbField: 'use_msl', transform: (v) => v === '1' },
];

interface SyncStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Validates a station object from the API
 */
function validateStation(station: RIDStationResponse): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!station.stationid) errors.push('Missing station_id');
  if (!station.stationcode) errors.push('Missing station_code');
  
  // Numeric validations
  if (station.latitude && isNaN(parseFloat(station.latitude))) {
    errors.push('Invalid latitude');
  }
  if (station.longitude && isNaN(parseFloat(station.longitude))) {
    errors.push('Invalid longitude');
  }
  if (station.hydroid && isNaN(parseInt(station.hydroid, 10))) {
    errors.push('Invalid hydro_id');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Maps API station data to database fields, excluding protected fields
 */
function mapStationToDbFields(station: RIDStationResponse): Record<string, any> {
  const dbFields: Record<string, any> = {
    data_source: 'RID',
    status: 'active',
    updated_at: new Date().toISOString()
  };

  for (const mapping of FIELD_MAPPINGS) {
    // Skip if this field maps to a protected field
    if (PROTECTED_FIELDS.includes(mapping.dbField)) {
      continue;
    }

    const apiValue = station[mapping.apiField];
    if (apiValue !== undefined && apiValue !== null) {
      dbFields[mapping.dbField] = mapping.transform ? mapping.transform(apiValue) : apiValue;
    }
  }

  return dbFields;
}

/**
 * Syncs a single station to the database
 */
async function syncStation(
  client: PoolClient,
  station: RIDStationResponse
): Promise<{ success: boolean; action: 'created' | 'updated' | 'skipped' | 'error'; error?: string }> {
  try {
    // Validate station data
    const validation = validateStation(station);
    if (!validation.isValid) {
      logger.warn('Invalid station data', {
        stationId: station.stationid,
        errors: validation.errors
      });
      return { success: false, action: 'skipped', error: validation.errors.join(', ') };
    }

    // Map API fields to database fields (excluding protected fields)
    const dbFields = mapStationToDbFields(station);

    // Check if station exists
    const existingStation = await client.query(
      'SELECT id FROM telemetry_data_stations WHERE station_id = $1',
      [station.stationid]
    );

    if (existingStation.rows.length === 0) {
      // Insert new station
      const fields = Object.keys(dbFields);
      const values = Object.values(dbFields);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      await client.query(
        `INSERT INTO telemetry_data_stations (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      logger.info('Created new station', { stationId: station.stationid });
      return { success: true, action: 'created' };
    } else {
      // Update existing station, excluding protected fields
      const setClause = Object.entries(dbFields)
        .filter(([field]) => !PROTECTED_FIELDS.includes(field))
        .map(([field, _], i) => `${field} = $${i + 2}`)
        .join(', ');
      
      await client.query(
        `UPDATE telemetry_data_stations SET ${setClause} WHERE station_id = $1`,
        [station.stationid, ...Object.values(dbFields).filter((_, i) => !PROTECTED_FIELDS.includes(Object.keys(dbFields)[i]))]
      );

      logger.info('Updated existing station', { 
        stationId: station.stationid,
        protectedFields: PROTECTED_FIELDS
      });
      return { success: true, action: 'updated' };
    }
  } catch (error) {
    logger.error('Error syncing station', {
      stationId: station.stationid,
      error: error instanceof Error ? error.message : String(error)
    });
    return { 
      success: false, 
      action: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main function to sync all stations from all hydro regions
 */
export async function syncAllStations(): Promise<SyncStats> {
  const stats: SyncStats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Process each hydro region (1-8)
    for (let hydroId = 1; hydroId <= 8; hydroId++) {
      logger.info(`Processing hydro region ${hydroId}`);
      
      try {
        // Get stations for this hydro region
        const stationList = await getStationList(hydroId.toString());
        if (!stationList.success || !Array.isArray(stationList.data)) {
          logger.error(`Failed to fetch stations for hydro region ${hydroId}`);
          continue;
        }

        stats.total += stationList.data.length;
        
        // Process each station
        for (const station of stationList.data) {
          const result = await syncStation(client, station);
          
          switch (result.action) {
            case 'created':
              stats.created++;
              break;
            case 'updated':
              stats.updated++;
              break;
            case 'skipped':
              stats.skipped++;
              break;
            case 'error':
              stats.errors++;
              break;
          }
        }
      } catch (error) {
        logger.error(`Error processing hydro region ${hydroId}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        stats.errors++;
      }
    }

    await client.query('COMMIT');
    logger.info('Sync completed', { stats });
    return stats;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Sync failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    client.release();
  }
}

// Run the sync if this file is executed directly
if (require.main === module) {
  syncAllStations()
    .then((stats) => {
      console.log('Sync completed successfully:', stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
} 