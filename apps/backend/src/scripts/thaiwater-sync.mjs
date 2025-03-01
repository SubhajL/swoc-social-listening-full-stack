// ThaiWater data sync script (ES Module version)
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
 * Syncs data from ThaiWater API to the database
 */
async function syncThaiWaterData(pool) {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    logger.info('[ThaiWaterSync] Starting data sync from ThaiWater API');
    
    // Fetch data from ThaiWater API
    // This is a placeholder - in a real implementation, you would call the actual API
    logger.info('[ThaiWaterSync] Fetching data from ThaiWater API');
    
    // For now, let's just insert some sample data for testing
    // Insert a sample telemetry station
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
        tambon
      ) VALUES (
        1001, 
        'Sample Station 1', 
        'สถานีตัวอย่าง 1', 
        'OLD001', 
        13.7563, 
        100.5018, 
        'rainfall', 
        1, 
        10.5, 
        15.2, 
        14.8, 
        true, 
        'กรุงเทพมหานคร', 
        'พระนคร', 
        'พระบรมมหาราชวัง'
      ) ON CONFLICT (tele_station_id) DO UPDATE SET
        tele_station_name = EXCLUDED.tele_station_name,
        updated_at = NOW()
    `);
    
    // Insert sample rainfall data
    const now = new Date();
    await client.query(`
      INSERT INTO thaiwater_rainfall_data (
        tele_station_id, 
        rainfall10m, 
        rainfall1h, 
        rainfall24h, 
        rainfall_datetime
      ) VALUES (
        1001, 
        0.5, 
        2.3, 
        15.7, 
        $1
      ) ON CONFLICT (tele_station_id, rainfall_datetime) DO UPDATE SET
        rainfall10m = EXCLUDED.rainfall10m,
        rainfall1h = EXCLUDED.rainfall1h,
        rainfall24h = EXCLUDED.rainfall24h,
        updated_at = NOW()
    `, [now]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('[ThaiWaterSync] Data sync completed successfully');
    
    return {
      success: true,
      message: 'Successfully synced ThaiWater data'
    };
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    logger.error('[ThaiWaterSync] Error syncing data', {
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
 * Task to sync ThaiWater data from API to database
 */
async function syncThaiWaterDataTask() {
  logger.info('[ThaiWaterSync] Starting ThaiWater data sync task', {
    timestamp: new Date().toISOString()
  });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    const result = await syncThaiWaterData(pool);
    
    if (result.success) {
      logger.info('[ThaiWaterSync] ThaiWater data sync completed successfully', {
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('[ThaiWaterSync] ThaiWater data sync failed', {
        error: result.error,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('[ThaiWaterSync] Error running ThaiWater data sync task', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  } finally {
    await pool.end();
  }
}

// Run task
syncThaiWaterDataTask()
  .then(() => {
    console.log('ThaiWater data sync task completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running ThaiWater data sync task:', error);
    process.exit(1);
  }); 