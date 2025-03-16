import { pool } from '../lib/db';
import { logger } from '../utils/logger';

/**
 * Test script to query TMD and HII stations based on location
 */
async function testRainStations() {
  try {
    logger.info('Starting test for rain stations query');

    // Test parameters
    const testLocations = [
      { province: 'เชียงใหม่', amphure: undefined },
      { province: 'กรุงเทพมหานคร', amphure: undefined },
      { province: 'สงขลา', amphure: undefined },
      { province: undefined, amphure: 'แม่แตง' },
      { province: undefined, amphure: 'บางกอกน้อย' }
    ];

    // Test each location
    for (const location of testLocations) {
      const { province, amphure } = location;
      
      logger.info(`Testing location: province=${province || 'N/A'}, amphure=${amphure || 'N/A'}`);
      
      // Build query for TMD stations
      let tmdQuery = `
        SELECT 
          tele_station_id as id,
          tele_station_name as name,
          tele_station_name_th as name_th,
          tele_station_lat as latitude,
          tele_station_long as longitude,
          tele_station_type as station_type,
          data_source,
          province,
          amphure,
          tambon
        FROM 
          thaiwater_tele_stations
        WHERE 
          data_source = 'TMD'
      `;
      
      const tmdParams: any[] = [];
      let paramIndex = 1;
      
      if (amphure) {
        tmdQuery += ` AND amphure = $${paramIndex}`;
        tmdParams.push(amphure);
        paramIndex++;
      }
      
      if (province) {
        tmdQuery += ` AND province = $${paramIndex}`;
        tmdParams.push(province);
        paramIndex++;
      }
      
      tmdQuery += ` ORDER BY tele_station_id LIMIT 5`;
      
      // Execute TMD query
      const tmdResult = await pool.query(tmdQuery, tmdParams);
      const tmdCount = tmdResult.rowCount || 0;
      
      logger.info(`Found ${tmdCount} TMD stations for location: province=${province || 'N/A'}, amphure=${amphure || 'N/A'}`);
      
      if (tmdCount > 0) {
        logger.info('Sample TMD stations:');
        tmdResult.rows.forEach((station, index) => {
          logger.info(`  ${index + 1}. ${station.name} (${station.id}) - ${station.province}, ${station.amphure}`);
        });
      }
      
      // Build query for HII stations
      let hiiQuery = `
        SELECT 
          tele_station_id as id,
          tele_station_name as name,
          tele_station_name_th as name_th,
          tele_station_lat as latitude,
          tele_station_long as longitude,
          tele_station_type as station_type,
          data_source,
          province,
          amphure,
          tambon
        FROM 
          thaiwater_tele_stations
        WHERE 
          data_source = 'HII'
      `;
      
      const hiiParams: any[] = [];
      paramIndex = 1;
      
      if (amphure) {
        hiiQuery += ` AND amphure = $${paramIndex}`;
        hiiParams.push(amphure);
        paramIndex++;
      }
      
      if (province) {
        hiiQuery += ` AND province = $${paramIndex}`;
        hiiParams.push(province);
        paramIndex++;
      }
      
      hiiQuery += ` ORDER BY tele_station_id LIMIT 5`;
      
      // Execute HII query
      const hiiResult = await pool.query(hiiQuery, hiiParams);
      const hiiCount = hiiResult.rowCount || 0;
      
      logger.info(`Found ${hiiCount} HII stations for location: province=${province || 'N/A'}, amphure=${amphure || 'N/A'}`);
      
      if (hiiCount > 0) {
        logger.info('Sample HII stations:');
        hiiResult.rows.forEach((station, index) => {
          logger.info(`  ${index + 1}. ${station.name} (${station.id}) - ${station.province}, ${station.amphure}`);
        });
      }
      
      // Test rainfall data query for the first station of each type
      if (tmdCount > 0) {
        const testStation = tmdResult.rows[0];
        
        const rainfallQuery = `
          SELECT 
            rainfall10m,
            rainfall1h,
            rainfall3h,
            rainfall24h,
            rainfall_datetime
          FROM 
            thaiwater_rainfall_data
          WHERE 
            tele_station_id = $1
          ORDER BY 
            rainfall_datetime DESC
          LIMIT 1
        `;
        
        const rainfallResult = await pool.query(rainfallQuery, [testStation.id]);
        const rainfallCount = rainfallResult.rowCount || 0;
        
        if (rainfallCount > 0) {
          logger.info(`Rainfall data for TMD station ${testStation.name} (${testStation.id}):`);
          logger.info(`  10m: ${rainfallResult.rows[0].rainfall10m || 'N/A'}`);
          logger.info(`  1h: ${rainfallResult.rows[0].rainfall1h || 'N/A'}`);
          logger.info(`  3h: ${rainfallResult.rows[0].rainfall3h || 'N/A'}`);
          logger.info(`  24h: ${rainfallResult.rows[0].rainfall24h || 'N/A'}`);
          logger.info(`  Datetime: ${rainfallResult.rows[0].rainfall_datetime || 'N/A'}`);
        } else {
          logger.info(`No rainfall data found for TMD station ${testStation.name} (${testStation.id})`);
        }
      }
      
      if (hiiCount > 0) {
        const testStation = hiiResult.rows[0];
        
        const rainfallQuery = `
          SELECT 
            rainfall10m,
            rainfall1h,
            rainfall3h,
            rainfall24h,
            rainfall_datetime
          FROM 
            thaiwater_rainfall_data
          WHERE 
            tele_station_id = $1
          ORDER BY 
            rainfall_datetime DESC
          LIMIT 1
        `;
        
        const rainfallResult = await pool.query(rainfallQuery, [testStation.id]);
        const rainfallCount = rainfallResult.rowCount || 0;
        
        if (rainfallCount > 0) {
          logger.info(`Rainfall data for HII station ${testStation.name} (${testStation.id}):`);
          logger.info(`  10m: ${rainfallResult.rows[0].rainfall10m || 'N/A'}`);
          logger.info(`  1h: ${rainfallResult.rows[0].rainfall1h || 'N/A'}`);
          logger.info(`  3h: ${rainfallResult.rows[0].rainfall3h || 'N/A'}`);
          logger.info(`  24h: ${rainfallResult.rows[0].rainfall24h || 'N/A'}`);
          logger.info(`  Datetime: ${rainfallResult.rows[0].rainfall_datetime || 'N/A'}`);
        } else {
          logger.info(`No rainfall data found for HII station ${testStation.name} (${testStation.id})`);
        }
      }
      
      logger.info('-----------------------------------');
    }
    
    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Error in test script:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the test
testRainStations().catch(error => {
  logger.error('Unhandled error in test script:', error);
  process.exit(1);
}); 