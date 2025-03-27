import { getHydroTelemetryData } from '../../services/rid-telemetry/telemetry.service.ts';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../../utils/logger.ts';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

// Update logger usage
const log = logger.child({ service: 'TelemetryDataTest' });

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testDataSync() {
  const client = await pool.connect();
  const testHydroId = '1'; // Test with hydro region 1
  
  try {
    await client.query('BEGIN');
    
    // Get current data count for comparison
    const startTime = new Date();
    startTime.setHours(0, 0, 0, 0);
    
    const currentData = await client.query(
      'SELECT COUNT(*) FROM telemetry_data WHERE reading_time >= $1',
      [startTime]
    );
    log.info(`Current data count for today: ${currentData.rows[0].count}`);
    
    // Get telemetry data from API
    const telemetryData = await getHydroTelemetryData(testHydroId);
    if (!telemetryData.success || !Array.isArray(telemetryData.data)) {
      throw new Error(`Failed to fetch telemetry data for hydro ${testHydroId}`);
    }
    
    log.info(`API returned ${telemetryData.data.length} readings for hydro ${testHydroId}`);
    
    // Process each reading
    let processedCount = 0;
    let newReadingsCount = 0;
    
    for (const reading of telemetryData.data) {
      processedCount++;
      
      // Convert hourlytime to UTC timestamp
      const readingTime = new Date(parseInt(reading.hourlytime.substr(6)));
      const readingTimeUtc = new Date(reading.hourlytimeUTC);
      
      // Check if reading exists
      const existingReading = await client.query(
        'SELECT station_id FROM telemetry_data WHERE station_id = $1 AND reading_time = $2',
        [reading.stationid, readingTime]
      );
      
      if (existingReading.rows.length === 0) {
        newReadingsCount++;
        // Log reading details before insert
        log.info('New reading found:', {
          stationId: reading.stationid,
          time: readingTime,
          waterLevel: reading.wlvalues,
          flowRate: reading.qvalues
        });
        
        await client.query(`
          INSERT INTO telemetry_data (
            station_id, reading_time, reading_time_utc,
            water_level, water_level_above, flow_rate,
            average_flow_rate, notation_id,
            source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          reading.stationid,
          readingTime,
          readingTimeUtc,
          reading.wlvalues,
          reading.wlvaluesabove,
          reading.qvalues,
          reading.qavrvalues,
          reading.notationid,
          'RID API'
        ]);
      }
      
      // Log progress every 100 readings
      if (processedCount % 100 === 0) {
        log.info(`Processed ${processedCount}/${telemetryData.data.length} readings`);
      }
    }
    
    await client.query('COMMIT');
    log.info(`Test completed. Processed ${processedCount} readings, found ${newReadingsCount} new readings`);
    
    // Final verification
    const finalData = await client.query(
      'SELECT COUNT(*) FROM telemetry_data WHERE reading_time >= $1',
      [startTime]
    );
    log.info(`Final data count for today: ${finalData.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    log.error('Error in test:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testDataSync().catch(error => {
  log.error('Test failed:', error);
  process.exit(1);
}); 