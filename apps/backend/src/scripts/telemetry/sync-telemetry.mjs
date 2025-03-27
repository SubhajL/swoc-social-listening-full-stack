#!/usr/bin/env node

import pg from 'pg';
const { Pool } = pg;
import { getStationList, getDailyStationList, getHydroTelemetryData } from '../../services/rid-telemetry/telemetry.service.ts';
import { logger } from '../../utils/logger.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Verify RID credentials are set
if (!process.env.RID_CONSUMER_KEY || !process.env.RID_CONSUMER_SECRET) {
  logger.error('RID OAuth credentials not found in environment variables', 'TelemetrySync');
  process.exit(1);
}

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Syncs station data from RID API
 */
async function syncStations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get station list from RID API for each hydro region (1-8)
    for (let hydroId = 1; hydroId <= 8; hydroId++) {
      logger.info(`Processing hydro region ${hydroId}`, 'TelemetrySync');

      // Get daily stations
      const dailyStations = await getDailyStationList(hydroId.toString());
      if (dailyStations.success && Array.isArray(dailyStations.data)) {
        for (const station of dailyStations.data) {
          // Check if station exists
          const existingStation = await client.query(
            'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
            [station.stationid]
          );

          if (existingStation.rows.length === 0) {
            // Only insert if station doesn't exist
            await client.query(`
              INSERT INTO telemetry_data_stations_backup (
                station_id, station_name, hydro_id, data_source,
                latitude, longitude, elevation, last_sync,
                station_code, hydro_name, basin_id, basin_name,
                province_code, brae_level, q_max, use_msl,
                use_msl_string, order_no, station_detail,
                zero_gauge, ground_level
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            `, [
              station.stationid,
              station.name,
              hydroId,
              'daily',
              station.latitude,
              station.longitude,
              station.elevation,
              new Date().toISOString(),
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
            logger.info(`Inserted new station: ${station.stationid}`, 'TelemetrySync');
          } else {
            logger.info(`Station ${station.stationid} already exists, skipping`, 'TelemetrySync');
          }
        }
      }

      // Get hourly stations
      const hourlyStations = await getStationList(hydroId);
      if (hourlyStations.success && Array.isArray(hourlyStations.data)) {
        for (const station of hourlyStations.data) {
          // Check if station exists
          const existingStation = await client.query(
            'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
            [station.stationid]
          );

          if (existingStation.rows.length === 0) {
            // Only insert if station doesn't exist
            await client.query(`
              INSERT INTO telemetry_data_stations_backup (
                station_id, station_name, hydro_id, data_source,
                latitude, longitude, elevation, last_sync,
                station_code, hydro_name, basin_id, basin_name,
                province_code, brae_level, q_max, use_msl,
                use_msl_string, order_no, station_detail,
                zero_gauge, ground_level
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            `, [
              station.stationid,
              station.stationname,
              hydroId,
              'hourly',
              station.latitude,
              station.longitude,
              station.elevation,
              new Date().toISOString(),
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
            logger.info(`Inserted new station: ${station.stationid}`, 'TelemetrySync');
          } else {
            logger.info(`Station ${station.stationid} already exists, skipping`, 'TelemetrySync');
          }
        }
      }
    }

    await client.query('COMMIT');
    logger.info('Station data sync completed successfully', 'TelemetrySync');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error syncing station data:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Syncs telemetry data for all hydro regions
 */
async function syncTelemetryData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Process each hydro region (1-8)
    for (let hydroId = 1; hydroId <= 8; hydroId++) {
      logger.info(`Processing telemetry data for hydro region ${hydroId}`, 'TelemetrySync');

      const telemetryData = await getHydroTelemetryData(hydroId.toString());
      if (telemetryData.success && Array.isArray(telemetryData.data)) {
        for (const reading of telemetryData.data) {
          // Extract timestamp from hourlytime (which is in local time +0700)
          const timestamp = parseInt(reading.hourlytime.substr(6));
          const localTime = new Date(timestamp);
          
          // Convert local time to UTC by subtracting 7 hours
          const utcTime = new Date(timestamp - (7 * 60 * 60 * 1000));

          await client.query(`
            INSERT INTO telemetry_data (
              station_id, reading_time, reading_time_utc,
              water_level, water_level_above, flow_rate,
              average_flow_rate, notation_id,
              source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (station_id, reading_time) DO UPDATE SET
              reading_time_utc = EXCLUDED.reading_time_utc,
              water_level = EXCLUDED.water_level,
              water_level_above = EXCLUDED.water_level_above,
              flow_rate = EXCLUDED.flow_rate,
              average_flow_rate = EXCLUDED.average_flow_rate,
              notation_id = EXCLUDED.notation_id,
              updated_at = CURRENT_TIMESTAMP
          `, [
            reading.stationid,
            localTime,
            utcTime,
            reading.wlvalues,
            reading.wlvaluesabove,
            reading.qvalues,
            reading.qavrvalues,
            reading.notationid,
            'RID API'
          ]);
        }
      }
    }

    await client.query('COMMIT');
    logger.info('Telemetry data sync completed successfully', 'TelemetrySync');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error syncing telemetry data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export sync functions
export { syncStations, syncTelemetryData };

// Main function to run the sync
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const isScheduled = args.includes('--scheduled');

    logger.info(`Running ${isScheduled ? 'scheduled' : 'manual'} sync`, 'TelemetrySync');

    if (!isScheduled) {
      // In manual mode, always run both station and data sync
      logger.info('Running manual station sync', 'TelemetrySync');
      await syncStations();
      logger.info('Running manual telemetry data sync', 'TelemetrySync');
      await syncTelemetryData();
    } else {
      // In scheduled mode:
      // 1. Check if it's end of month for station sync
      const now = new Date();
      const isEndOfMonth = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const isHourlySync = now.getMinutes() === 20;

      if (isEndOfMonth) {
        logger.info('Running scheduled monthly station sync', 'TelemetrySync');
        await syncStations();
      }

      // 2. Run data sync at :20 of every hour
      if (isHourlySync) {
        logger.info('Running scheduled hourly telemetry data sync', 'TelemetrySync');
        await syncTelemetryData();
      } else {
        logger.info('Skipping telemetry data sync - not scheduled time (:20)', 'TelemetrySync');
      }
    }

    process.exit(0);
  } catch (error) {
    logger.error('Sync failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main(); 