import pkg from 'pg';
const { Pool } = pkg;
import { logger } from '../../utils/logger';

// Initialize database connection pool with credentials from .env
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * Debug function to check for mae-tang specific matching issues
 * This will check for all variations of the location string that might exist
 */
export async function checkMaeTangStations(): Promise<any> {
  try {
    logger.info('[MaeTangChecker] Starting specific check for Mae Tang stations');
    
    // Define different spellings and variations
    const variations = [
      'แม่แตง',         // Standard spelling
      'แม่ แตง',        // With space
      'เเม่แตง',        // Alternative Thai character for 'แ'
      'แม่แต่ง',        // Similar spelling
      '%แม่%แตง%',      // Any characters in between
      '%แม่แตง%',       // Anything after
      '%แตง%',          // Just the second part
      'mae tang',       // English spelling
      'mae taeng',      // Alternative English spelling
      'maetang',        // No space
      'maetaeng'        // Alternative no space
    ];
    
    // Results object
    const results: Record<string, any> = {};
    
    // Check each variation
    for (const variation of variations) {
      logger.info(`[MaeTangChecker] Checking for variation: "${variation}"`);
      
      // Amphure query
      const amphureQuery = `
        SELECT 
          station_id, 
          station_name, 
          amphure, 
          province, 
          status
        FROM 
          telemetry_data_stations
        WHERE 
          amphure LIKE $1
        ORDER BY 
          station_name
        LIMIT 10
      `;
      
      const amphureResult = await pool.query(amphureQuery, [variation]);
      
      // Province query
      const provinceQuery = `
        SELECT 
          station_id, 
          station_name, 
          amphure, 
          province, 
          status
        FROM 
          telemetry_data_stations
        WHERE 
          province LIKE $1
        ORDER BY 
          station_name
        LIMIT 10
      `;
      
      const provinceResult = await pool.query(provinceQuery, [variation]);
      
      // Store results
      results[variation] = {
        amphure: {
          count: amphureResult.rows.length,
          stations: amphureResult.rows
        },
        province: {
          count: provinceResult.rows.length,
          stations: provinceResult.rows
        }
      };
      
      logger.info(`[MaeTangChecker] Results for "${variation}":`, {
        amphureCount: amphureResult.rows.length,
        provinceCount: provinceResult.rows.length
      });
    }
    
    // Also check for any stations with similar names
    const stationNameQuery = `
      SELECT 
        station_id, 
        station_name, 
        amphure, 
        province, 
        status
      FROM 
        telemetry_data_stations
      WHERE 
        station_name LIKE $1
        OR station_name LIKE $2
      ORDER BY 
        station_name
      LIMIT 20
    `;
    
    const stationNameResult = await pool.query(stationNameQuery, ['%แม่แตง%', '%mae tang%']);
    
    results['station_name_search'] = {
      count: stationNameResult.rows.length,
      stations: stationNameResult.rows
    };
    
    logger.info('[MaeTangChecker] Station name search results:', {
      count: stationNameResult.rows.length
    });
    
    // Check if there are any telemetry_data entries for these stations
    if (stationNameResult.rows.length > 0) {
      const stationIds = stationNameResult.rows.map(row => row.station_id);
      
      const telemetryDataQuery = `
        SELECT 
          station_id,
          COUNT(*) as entry_count,
          MIN(reading_time) as oldest_entry,
          MAX(reading_time) as newest_entry
        FROM 
          telemetry_data
        WHERE 
          station_id = ANY($1)
        GROUP BY 
          station_id
      `;
      
      const telemetryDataResult = await pool.query(telemetryDataQuery, [stationIds]);
      
      results['telemetry_data'] = {
        count: telemetryDataResult.rows.length,
        data: telemetryDataResult.rows
      };
      
      logger.info('[MaeTangChecker] Telemetry data check results:', {
        count: telemetryDataResult.rows.length,
        stationIds: stationIds
      });
    }
    
    return results;
  } catch (error) {
    logger.error('[MaeTangChecker] Error checking for Mae Tang stations:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
} 