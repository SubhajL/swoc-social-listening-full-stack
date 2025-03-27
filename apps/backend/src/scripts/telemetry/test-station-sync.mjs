import { getDailyStationList } from '../../services/rid-telemetry/telemetry.service.ts';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../../utils/logger.ts';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

const log = logger.child({ service: 'TelemetryStationTest' });

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testStationSync() {
  const client = await pool.connect();
  const testHydroId = '1'; // Test with hydro region 1
  
  try {
    await client.query('BEGIN');
    
    // Get current stations for comparison
    const currentStations = await client.query(
      'SELECT station_id FROM telemetry_data_stations WHERE hydro_id = $1',
      [testHydroId]
    );
    log.info(`Current station count for hydro ${testHydroId}: ${currentStations.rows.length}`);
    
    // Get daily stations from API
    const dailyStations = await getDailyStationList(testHydroId);
    if (!dailyStations.success || !Array.isArray(dailyStations.data)) {
      throw new Error(`Failed to fetch daily stations for hydro ${testHydroId}`);
    }
    
    log.info(`API returned ${dailyStations.data.length} stations for hydro ${testHydroId}`);
    
    // Count new stations
    let newStationCount = 0;
    
    for (const station of dailyStations.data) {
      // Check if station exists
      const existingStation = await client.query(
        'SELECT station_id FROM telemetry_data_stations WHERE station_id = $1',
        [station.stationid]
      );
      
      if (existingStation.rows.length === 0) {
        newStationCount++;
        // Log station details before insert
        log.info('New station found:', {
          stationId: station.stationid,
          name: station.name,
          code: station.stationcode
        });
        
        // Only insert if station doesn't exist
        await client.query(`
          INSERT INTO telemetry_data_stations (
            station_id, station_name, hydro_id, data_source,
            latitude, longitude, last_sync,
            station_code, hydro_name, basin_id, basin_name,
            province_code, brae_level, q_max, use_msl,
            use_msl_string, order_no, station_detail,
            zero_gauge, ground_level
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
          station.stationid,
          station.name,
          testHydroId,
          'daily',
          station.latitude,
          station.longitude,
          new Date(),
          station.stationcode,
          station.hydroname,
          station.basinid,
          station.basinname,
          station.provincecode,
          station.braelevel,
          station.QMax,
          station.UseMSL,
          station.UseMSLString,
          station.orderno,
          station.stationdetail,
          station.ZG,
          station.GroundLevel
        ]);
      }
    }
    
    await client.query('COMMIT');
    log.info(`Test completed. Found ${newStationCount} new stations`);
    
    // Final verification
    const finalStations = await client.query(
      'SELECT station_id FROM telemetry_data_stations WHERE hydro_id = $1',
      [testHydroId]
    );
    log.info(`Final station count: ${finalStations.rows.length}`);
    
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
testStationSync().catch(error => {
  log.error('Test failed:', error);
  process.exit(1);
}); 