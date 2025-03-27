import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import winston from 'winston';
import { getDailyStationList, getStationList, getDailyStationCount, getStationCount } from '../../services/rid-telemetry/telemetry.service.ts';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

// Set up logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Database configuration
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function syncStations(hydroId, stationType) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current stations for comparison
    const currentStations = await client.query(
      'SELECT station_id FROM telemetry_data_stations_backup WHERE hydro_id = $1 AND data_source = $2',
      [hydroId, stationType]
    );
    logger.info(`Current ${stationType} station count for hydro ${hydroId}: ${currentStations.rows.length}`);
    
    // Get current station counts
    const currentDailyCount = await getDailyStationCount(hydroId);
    const currentHourlyCount = await getStationCount(hydroId);
    
    logger.info(`Current daily station count for hydro ${hydroId}: ${currentDailyCount}`);
    logger.info(`Current hourly station count for hydro ${hydroId}: ${currentHourlyCount}`);

    // Fetch daily station list
    logger.info(`Fetching daily station list for hydro ${hydroId}...`);
    const dailyStations = await getDailyStationList(hydroId);
    logger.info(`API Response: ${JSON.stringify(dailyStations, null, 2)}`);
    
    // Fetch hourly station list
    logger.info(`Fetching hourly station list for hydro ${hydroId}...`);
    const hourlyStations = await getStationList(hydroId);
    logger.info(`API Response: ${JSON.stringify(hourlyStations, null, 2)}`);
    
    if (!dailyStations.success || !Array.isArray(dailyStations.data)) {
      throw new Error(`Failed to fetch daily stations for hydro ${hydroId}`);
    }
    
    if (!hourlyStations.success || !Array.isArray(hourlyStations.data)) {
      throw new Error(`Failed to fetch hourly stations for hydro ${hydroId}`);
    }
    
    logger.info(`API returned ${dailyStations.data.length} daily stations for hydro ${hydroId}`);
    logger.info(`API returned ${hourlyStations.data.length} hourly stations for hydro ${hydroId}`);
    
    // Count new stations
    let newStationCount = 0;
    
    for (const station of dailyStations.data) {
      // Check if station exists
      const existingStation = await client.query(
        'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
        [station.stationid]
      );
      
      if (existingStation.rows.length === 0) {
        newStationCount++;
        // Log station details before insert
        logger.info('New station found:', {
          stationId: station.stationid,
          name: station.name,
          code: station.stationcode,
          type: 'daily'
        });
        
        // Only insert if station doesn't exist
        await client.query(`
          INSERT INTO telemetry_data_stations_backup (
            station_id, station_code, station_name, station_detail,
            hydro_id, hydro_name, basin_id, basin_name,
            province_code, amphure_code, latitude, longitude,
            ground_level, q_max, zg, brae_level,
            use_msl, use_q_auto, telemetry_id, telemetry_source,
            show_hourly_report, show_daily_report, is_warning, status,
            notes, data_source, category, has_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        `, [
          station.stationid,
          station.stationcode,
          station.name,
          station.stationdetail,
          station.hydroid,
          station.hydroname,
          station.basinid,
          station.basinname,
          station.provincecode,
          station.amphurcode,
          station.latitude,
          station.longitude,
          station.GroundLevel,
          station.QMax,
          station.ZG,
          station.braelevel,
          station.UseMSL,
          station.UseQAuto,
          station.TelemetryID,
          station.TelemetrySource,
          station.ShowHourlyReport,
          station.ShowDailyReport,
          false, // is_warning default
          'active', // status default
          station.note,
          'daily', // data_source
          '', // category default
          true // has_data default
        ]);
      }
    }
    
    for (const station of hourlyStations.data) {
      // Check if station exists
      const existingStation = await client.query(
        'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
        [station.stationid]
      );
      
      if (existingStation.rows.length === 0) {
        newStationCount++;
        // Log station details before insert
        logger.info('New station found:', {
          stationId: station.stationid,
          name: station.name,
          code: station.stationcode,
          type: 'hourly'
        });
        
        // Only insert if station doesn't exist
        await client.query(`
          INSERT INTO telemetry_data_stations_backup (
            station_id, station_code, station_name, station_detail,
            hydro_id, hydro_name, basin_id, basin_name,
            province_code, amphure_code, latitude, longitude,
            ground_level, q_max, zg, brae_level,
            use_msl, use_q_auto, telemetry_id, telemetry_source,
            show_hourly_report, show_daily_report, is_warning, status,
            notes, data_source, category, has_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        `, [
          station.stationid,
          station.stationcode,
          station.name,
          station.stationdetail,
          station.hydroid,
          station.hydroname,
          station.basinid,
          station.basinname,
          station.provincecode,
          station.amphurcode,
          station.latitude,
          station.longitude,
          station.GroundLevel,
          station.QMax,
          station.ZG,
          station.braelevel,
          station.UseMSL,
          station.UseQAuto,
          station.TelemetryID,
          station.TelemetrySource,
          station.ShowHourlyReport,
          station.ShowDailyReport,
          false, // is_warning default
          'active', // status default
          station.note,
          'hourly', // data_source
          '', // category default
          true // has_data default
        ]);
      }
    }
    
    await client.query('COMMIT');
    logger.info(`Test completed for hydro ${hydroId} ${stationType} stations. Found ${newStationCount} new stations`);
    
    // Final verification
    const finalStations = await client.query(
      'SELECT station_id FROM telemetry_data_stations_backup WHERE hydro_id = $1 AND data_source = $2',
      [hydroId, stationType]
    );
    logger.info(`Final ${stationType} station count for hydro ${hydroId}: ${finalStations.rows.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error in test for hydro ${hydroId} ${stationType} stations:`, error);
    throw error;
  } finally {
    client.release();
  }
}

async function testStationSync() {
  try {
    // Test all hydro IDs 1-8
    for (let hydroId = 1; hydroId <= 8; hydroId++) {
      logger.info(`\nTesting hydro ID ${hydroId}...`);
      
      // Test daily stations
      await syncStations(hydroId.toString(), 'daily');
      
      // Test hourly stations
      await syncStations(hydroId.toString(), 'hourly');
    }
    
    logger.info('\nAll hydro IDs tested successfully');
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testStationSync().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
}); 