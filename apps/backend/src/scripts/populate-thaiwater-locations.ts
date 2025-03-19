import { Pool } from 'pg';
import dotenv from 'dotenv';
import { reverseGeocode, isWithinThailand } from '../services/geocoding/reverse-geocoding.service';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Configuration
const BATCH_SIZE = 50;
const DELAY_BETWEEN_REQUESTS_MS = 200;

/**
 * Options for populating ThaiWater locations
 */
export interface PopulateThaiWaterLocationsOptions {
  /** Limit the number of stations to process (for testing) */
  limit?: number;
  /** Only process stations without location data */
  newOnly?: boolean;
}

/**
 * Populates administrative location data (province, amphure, tambon) for ThaiWater stations
 * using a hybrid approach:
 * 1. First attempt: Use PostGIS spatial join if available
 * 2. Second attempt: Use Google Maps API for remaining stations
 */
export async function populateThaiWaterLocations(options: PopulateThaiWaterLocationsOptions = {}) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  logger.info('[LocationPopulation] Starting population of ThaiWater station locations');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Check if PostGIS is available
    let hasPostGIS = false;
    try {
      const postgisCheck = await client.query(`
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      `);
      hasPostGIS = postgisCheck.rows.length > 0;
    } catch (error) {
      logger.warn('[LocationPopulation] PostGIS not available, skipping spatial join approach');
    }
    
    // Step 2: If PostGIS is available, check if we have Thailand admin boundaries table
    let hasAdminBoundaries = false;
    if (hasPostGIS) {
      try {
        const adminBoundariesCheck = await client.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'thailand_admin_boundaries'
        `);
        hasAdminBoundaries = adminBoundariesCheck.rows.length > 0;
      } catch (error) {
        logger.warn('[LocationPopulation] Thailand admin boundaries table not available');
      }
    }
    
    // Step 3: If we have PostGIS and admin boundaries, use spatial join
    let spatialJoinCount = 0;
    if (hasPostGIS && hasAdminBoundaries) {
      logger.info('[LocationPopulation] Using PostGIS spatial join for location data');
      
      try {
        const spatialJoinResult = await client.query(`
          UPDATE thaiwater_tele_stations AS s
          SET 
            province = p.name_th,
            amphure = a.name_th,
            tambon = t.name_th,
            updated_at = NOW()
          FROM 
            thailand_provinces AS p,
            thailand_amphures AS a,
            thailand_tambons AS t
          WHERE 
            a.province_id = p.id
            AND t.amphure_id = a.id
            AND ST_Contains(p.geom, s.geom)
            AND ST_Contains(a.geom, s.geom)
            AND ST_Contains(t.geom, s.geom)
            AND (s.province IS NULL OR s.province = '')
            AND s.tele_station_lat BETWEEN 5.5 AND 20.5
            AND s.tele_station_long BETWEEN 97.5 AND 105.5
          RETURNING s.tele_station_id
        `);
        
        spatialJoinCount = spatialJoinResult.rowCount || 0;
        logger.info(`[LocationPopulation] Updated ${spatialJoinCount} stations using spatial join`);
      } catch (error) {
        logger.error('[LocationPopulation] Error performing spatial join', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Step 4: Get remaining stations that need geocoding
    let stationsQuery = `
      SELECT 
        tele_station_id, 
        tele_station_lat, 
        tele_station_long,
        data_source
      FROM 
        thaiwater_tele_stations 
      WHERE 
        tele_station_lat IS NOT NULL 
        AND tele_station_long IS NOT NULL
        AND (province IS NULL OR province = '')
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
    `;
    
    // Add additional filters based on options
    if (options.newOnly) {
      stationsQuery += ` AND created_at > (NOW() - INTERVAL '7 days')`;
    }
    
    // Add limit if specified
    if (options.limit && options.limit > 0) {
      stationsQuery += ` LIMIT ${options.limit}`;
    }
    
    const stationsResult = await client.query(stationsQuery);
    const stations = stationsResult.rows;
    
    logger.info(`[LocationPopulation] Found ${stations.length} stations for API geocoding`);
    
    // Step 5: Process stations in batches
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      
      logger.info(`[LocationPopulation] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(stations.length/BATCH_SIZE)}`);
      
      for (const station of batch) {
        try {
          const lat = parseFloat(station.tele_station_lat);
          const lng = parseFloat(station.tele_station_long);
          
          // Skip if coordinates are invalid or outside Thailand
          if (isNaN(lat) || isNaN(lng) || !isWithinThailand(lat, lng)) {
            logger.warn(`[LocationPopulation] Skipping station ${station.tele_station_id} with invalid or out-of-bounds coordinates: ${lat}, ${lng}`);
            failureCount++;
            continue;
          }
          
          // Use Google Maps API for geocoding
          const location = await reverseGeocode(lat, lng);
          
          if (location && location.province) {
            await client.query(`
              UPDATE thaiwater_tele_stations
              SET 
                province = $1,
                amphure = $2,
                tambon = $3,
                updated_at = NOW()
              WHERE tele_station_id = $4
            `, [location.province, location.amphure, location.tambon, station.tele_station_id]);
            
            logger.info(`[LocationPopulation] Updated station ${station.tele_station_id} (${station.data_source || 'unknown'}) with location: ${location.province}, ${location.amphure}, ${location.tambon}`);
            successCount++;
          } else {
            logger.warn(`[LocationPopulation] Failed to geocode station ${station.tele_station_id} at coordinates: ${lat}, ${lng}`);
            failureCount++;
          }
        } catch (error) {
          logger.error(`[LocationPopulation] Error processing station ${station.tele_station_id}`, {
            error: error instanceof Error ? error.message : String(error)
          });
          failureCount++;
        }
        
        processedCount++;
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
      }
      
      logger.info(`[LocationPopulation] Progress: ${processedCount}/${stations.length} stations processed`);
    }
    
    // Step 6: Generate a report of stations still missing location data
    const missingLocationReport = await client.query(`
      SELECT 
        COUNT(*) as total_missing,
        data_source,
        COUNT(*) FILTER (WHERE tele_station_type = 'R') as missing_rain_stations
      FROM 
        thaiwater_tele_stations 
      WHERE 
        (province IS NULL OR province = '')
        AND tele_station_lat BETWEEN 5.5 AND 20.5
        AND tele_station_long BETWEEN 97.5 AND 105.5
      GROUP BY data_source
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Log summary
    logger.info('[LocationPopulation] Location population completed', {
      totalStations: stations.length,
      spatialJoinCount,
      apiGeocodingSuccess: successCount,
      apiGeocodingFailure: failureCount,
      missingLocationReport: missingLocationReport.rows
    });
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[LocationPopulation] Error populating locations', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
  } finally {
    // Release client back to pool
    client.release();
    await pool.end();
  }
}

// Run the population function if this script is executed directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: PopulateThaiWaterLocationsOptions = {};
  
  // Check for --limit flag
  const limitIndex = args.findIndex(arg => arg.startsWith('--limit='));
  if (limitIndex !== -1) {
    const limitValue = args[limitIndex].split('=')[1];
    options.limit = parseInt(limitValue, 10);
  }
  
  // Check for --new-only flag
  options.newOnly = args.includes('--new-only');
  
  populateThaiWaterLocations(options).catch(error => {
    logger.error('[LocationPopulation] Unhandled error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  });
} 