// Script to verify database connection and check thaiwater_rainfall_data_new table
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
 * Main function to verify database connection and table
 */
async function verifyThaiWaterTable() {
  logger.info('[Verification] Starting database connection verification');
  
  // Log the DATABASE_URL (with password masked)
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  logger.info(`[Verification] Using database URL: ${maskedUrl}`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  let client;
  
  try {
    // Test connection
    logger.info('[Verification] Testing database connection');
    client = await pool.connect();
    logger.info('[Verification] Database connection successful');
    
    // Check if the new table exists
    logger.info('[Verification] Checking if thaiwater_rainfall_data_new table exists');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'thaiwater_rainfall_data_new'
    `);
    
    if (tableCheck.rows.length > 0) {
      logger.info('[Verification] thaiwater_rainfall_data_new table exists');
      
      // Count records in the table
      const countQuery = await client.query(`
        SELECT COUNT(*) as count FROM thaiwater_rainfall_data_new
      `);
      
      logger.info(`[Verification] thaiwater_rainfall_data_new has ${countQuery.rows[0].count} records`);
      
      // Check if rainfall_today column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'thaiwater_rainfall_data_new' 
        AND column_name = 'rainfall_today'
      `);
      
      if (columnCheck.rows.length > 0) {
        logger.info('[Verification] rainfall_today column exists in thaiwater_rainfall_data_new');
      } else {
        logger.warn('[Verification] rainfall_today column does NOT exist in thaiwater_rainfall_data_new');
      }
      
      // Check for null values in rainfall_today
      const nullCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM thaiwater_rainfall_data_new 
        WHERE rainfall_today IS NULL
      `);
      
      logger.info(`[Verification] Found ${nullCheck.rows[0].count} records with NULL rainfall_today values`);
      
      return {
        success: true,
        message: 'Verification completed successfully',
        tableExists: true,
        recordCount: countQuery.rows[0].count,
        columnExists: columnCheck.rows.length > 0,
        nullCount: nullCheck.rows[0].count
      };
    } else {
      logger.warn('[Verification] thaiwater_rainfall_data_new table does NOT exist');
      
      // Check if the old table exists
      const oldTableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'thaiwater_rainfall_data'
      `);
      
      if (oldTableCheck.rows.length > 0) {
        logger.info('[Verification] thaiwater_rainfall_data (old table) exists');
        
        // Count records in the old table
        const oldCountQuery = await client.query(`
          SELECT COUNT(*) as count FROM thaiwater_rainfall_data
        `);
        
        logger.info(`[Verification] thaiwater_rainfall_data has ${oldCountQuery.rows[0].count} records`);
      } else {
        logger.warn('[Verification] thaiwater_rainfall_data (old table) does NOT exist');
      }
      
      return {
        success: true,
        message: 'Verification completed successfully',
        tableExists: false,
        oldTableExists: oldTableCheck.rows.length > 0,
        oldRecordCount: oldTableCheck.rows.length > 0 ? oldCountQuery.rows[0].count : 0
      };
    }
    
  } catch (error) {
    logger.error('[Verification] Error verifying database connection or table', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      message: 'Verification failed',
      error: error instanceof Error ? error.message : String(error)
    };
    
  } finally {
    // Release client back to pool
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the verification function
verifyThaiWaterTable()
  .then((result) => {
    console.log('Verification completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (result.tableExists) {
      console.log(`Table exists with ${result.recordCount} records`);
      console.log(`rainfall_today column exists: ${result.columnExists}`);
      console.log(`Records with NULL rainfall_today: ${result.nullCount}`);
    } else {
      console.log('Table does not exist');
      if (result.oldTableExists) {
        console.log(`Old table exists with ${result.oldRecordCount} records`);
      }
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running verification:', error);
    process.exit(1);
  }); 