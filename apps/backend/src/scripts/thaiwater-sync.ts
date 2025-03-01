import { syncThaiWaterData } from '../services/thaiwater/thaiwater-db.service';
import { logger } from '../utils/logger';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Task to sync ThaiWater data from API to database
 */
export async function syncThaiWaterDataTask(): Promise<void> {
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

// Run task if this file is executed directly
if (require.main === module) {
  syncThaiWaterDataTask()
    .then(() => {
      console.log('ThaiWater data sync task completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error running ThaiWater data sync task:', error);
      process.exit(1);
    });
} 