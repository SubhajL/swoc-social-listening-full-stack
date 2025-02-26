import { logger } from '../utils/logger';
import { getRainfallByLocation } from '../services/thaiwater/thaiwater.service';
import { pool } from '../lib/db';

/**
 * Test script to verify that the ThaiWater service can correctly fetch rainfall data
 * using the new amphure table for geographic boundaries.
 */
async function testThaiWaterLocation() {
  try {
    logger.info('Starting ThaiWater location test');

    // First, check if the amphure table exists and has data
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'amphure'
      );
    `);

    const tableExists = tableCheckResult.rows[0].exists;
    if (!tableExists) {
      logger.error('The amphure table does not exist. Please run the create-amphure-table script first.');
      process.exit(1);
    }

    // Check if the table has data
    const dataCheckResult = await pool.query('SELECT COUNT(*) FROM amphure');
    const rowCount = parseInt(dataCheckResult.rows[0].count);
    
    logger.info(`Amphure table exists with ${rowCount} rows`);

    if (rowCount === 0) {
      logger.warn('The amphure table exists but has no data. Geographic queries may not work correctly.');
    }

    // Check if the geom column exists
    const geomCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'amphure' 
        AND column_name = 'geom'
      );
    `);

    const geomExists = geomCheckResult.rows[0].exists;
    if (!geomExists) {
      logger.error('The geom column does not exist in the amphure table. Spatial queries will not work.');
      process.exit(1);
    }

    // Get a sample amphure and province to test with
    const sampleResult = await pool.query('SELECT amphure_name, province_name FROM amphure LIMIT 1');
    
    if (sampleResult.rows.length === 0) {
      logger.error('Could not find a sample amphure and province to test with.');
      process.exit(1);
    }

    const { amphure_name, province_name } = sampleResult.rows[0];
    
    logger.info(`Testing with amphure: ${amphure_name}, province: ${province_name}`);

    // Test 1: Get rainfall by amphure
    logger.info('Test 1: Getting rainfall by amphure');
    const amphureResult = await getRainfallByLocation(amphure_name, null);
    
    logger.info('Amphure test result:', {
      success: amphureResult.success,
      message: amphureResult.message,
      dataCount: amphureResult.data.length,
      location: amphureResult.location
    });

    // Test 2: Get rainfall by province
    logger.info('Test 2: Getting rainfall by province');
    const provinceResult = await getRainfallByLocation(null, province_name);
    
    logger.info('Province test result:', {
      success: provinceResult.success,
      message: provinceResult.message,
      dataCount: provinceResult.data.length,
      location: provinceResult.location
    });

    // Test 3: Get rainfall by both amphure and province
    logger.info('Test 3: Getting rainfall by both amphure and province');
    const combinedResult = await getRainfallByLocation(amphure_name, province_name);
    
    logger.info('Combined test result:', {
      success: combinedResult.success,
      message: combinedResult.message,
      dataCount: combinedResult.data.length,
      location: combinedResult.location
    });

    logger.info('ThaiWater location tests completed');
  } catch (error) {
    logger.error('Error testing ThaiWater location service:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the test
testThaiWaterLocation(); 