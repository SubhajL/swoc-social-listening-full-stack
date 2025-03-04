// ThaiWater rainfall data fetch script
import pg from 'pg';
import dotenv from 'dotenv';
import winston from 'winston';

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

/**
 * Fetches rainfall data from the database
 */
async function fetchRainfallData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    logger.info('[ThaiWaterRainfall] Fetching rainfall data from database');
    
    // Get total count of rainfall records
    const countResult = await pool.query('SELECT COUNT(*) FROM thaiwater_rainfall_data');
    const totalCount = parseInt(countResult.rows[0].count, 10);
    
    logger.info(`[ThaiWaterRainfall] Found ${totalCount} rainfall records in database`);
    
    // Fetch the latest rainfall data for each station
    const result = await pool.query(`
      SELECT 
        r.*,
        s.tele_station_name,
        s.tele_station_name_th,
        s.tele_station_lat,
        s.tele_station_long,
        s.tele_station_type,
        s.agency_id,
        s.ground_level,
        s.left_bank,
        s.right_bank,
        s.is_warning,
        s.province,
        s.amphure,
        s.tambon
      FROM thaiwater_rainfall_data r
      JOIN thaiwater_tele_stations s ON r.tele_station_id = s.tele_station_id
      WHERE r.rainfall_datetime = (
        SELECT MAX(rainfall_datetime)
        FROM thaiwater_rainfall_data
        WHERE tele_station_id = r.tele_station_id
      )
      ORDER BY r.rainfall_datetime DESC
      LIMIT 20
    `);
    
    logger.info(`[ThaiWaterRainfall] Fetched ${result.rows.length} latest rainfall records`);
    
    // Get distribution of rainfall values
    const rainfallDistribution = await pool.query(`
      SELECT 
        CASE 
          WHEN rainfall24h < 10 THEN 'Light (< 10mm)'
          WHEN rainfall24h >= 10 AND rainfall24h < 35 THEN 'Moderate (10-35mm)'
          WHEN rainfall24h >= 35 AND rainfall24h < 90 THEN 'Heavy (35-90mm)'
          WHEN rainfall24h >= 90 THEN 'Very Heavy (>= 90mm)'
        END as rainfall_category,
        COUNT(*) as count
      FROM thaiwater_rainfall_data
      WHERE rainfall_datetime = (
        SELECT MAX(rainfall_datetime)
        FROM thaiwater_rainfall_data
        WHERE tele_station_id = thaiwater_rainfall_data.tele_station_id
      )
      GROUP BY rainfall_category
      ORDER BY rainfall_category
    `);
    
    logger.info('[ThaiWaterRainfall] Rainfall distribution by category:');
    rainfallDistribution.rows.forEach(row => {
      logger.info(`  ${row.rainfall_category}: ${row.count} stations`);
    });
    
    // Display the rainfall data
    console.log('\n=== Latest Rainfall Data ===\n');
    result.rows.forEach((row, index) => {
      console.log(`Record #${index + 1}:`);
      console.log(`  Station ID: ${row.tele_station_id}`);
      console.log(`  Station Name: ${row.tele_station_name || 'N/A'}`);
      console.log(`  Station Name (TH): ${row.tele_station_name_th || 'N/A'}`);
      console.log(`  Location: ${row.province || 'N/A'}, ${row.amphure || 'N/A'}, ${row.tambon || 'N/A'}`);
      console.log(`  Coordinates: ${row.tele_station_lat}, ${row.tele_station_long}`);
      console.log(`  Rainfall (10min): ${row.rainfall10m} mm`);
      console.log(`  Rainfall (1hr): ${row.rainfall1h} mm`);
      console.log(`  Rainfall (24hr): ${row.rainfall24h} mm`);
      console.log(`  Timestamp: ${row.rainfall_datetime}`);
      console.log(`  Warning Status: ${row.is_warning ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    console.log('\n=== Rainfall Distribution ===\n');
    rainfallDistribution.rows.forEach(row => {
      console.log(`  ${row.rainfall_category}: ${row.count} stations`);
    });
    
    return {
      success: true,
      totalCount,
      records: result.rows,
      distribution: rainfallDistribution.rows
    };
    
  } catch (error) {
    logger.error('[ThaiWaterRainfall] Error fetching rainfall data', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    await pool.end();
  }
}

// Run the fetch function
fetchRainfallData()
  .then((result) => {
    if (result.success) {
      logger.info('[ThaiWaterRainfall] Successfully fetched rainfall data');
    } else {
      logger.error('[ThaiWaterRainfall] Failed to fetch rainfall data', {
        error: result.error
      });
    }
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[ThaiWaterRainfall] Unhandled error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }); 