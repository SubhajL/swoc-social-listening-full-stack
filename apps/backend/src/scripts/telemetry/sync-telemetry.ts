#!/usr/bin/env node

import pg from 'pg';
const { Pool } = pg;
import { getStationList, getDailyStationList, getHydroTelemetryData } from '../../services/rid-telemetry/telemetry.service.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { RIDStationResponse } from '../../services/rid-telemetry/telemetry.service.js';
import { getLocationDetails, type LocationDetails } from '../../services/google-maps/google-maps.service.js';

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
          // Type assertion to handle the API response
          const stationData = station as unknown as RIDStationResponse;
          // Check if station exists
          const existingStation = await client.query(
            'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
            [stationData.stationid]
          );

          if (existingStation.rows.length === 0) {
            // Get location details from Google Maps API
            const defaultLocationDetails: LocationDetails = {
              province: null,
              amphure: null,
              tambon: null,
              formatted_address: null
            };
            let locationDetails = defaultLocationDetails;

            if (stationData.latitude && stationData.longitude) {
              try {
                locationDetails = await getLocationDetails(
                  parseFloat(stationData.latitude),
                  parseFloat(stationData.longitude)
                );
                logger.info(`Fetched location details for station ${stationData.stationid}`, {
                  province: locationDetails.province,
                  amphure: locationDetails.amphure,
                  tambon: locationDetails.tambon
                });
              } catch (error) {
                logger.error(`Failed to fetch location details for station ${stationData.stationid}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Insert new station if it doesn't exist
            await client.query(`
              INSERT INTO telemetry_data_stations_backup (
                station_id, station_name, hydro_id, data_source,
                latitude, longitude, elevation, last_sync,
                station_code, hydro_name, basin_id, basin_name,
                province_code, brae_level, q_max, use_msl,
                use_msl_string, order_no, station_detail,
                zero_gauge, ground_level,
                province, amphure, tambon, formatted_address
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
            `, [
              stationData.stationid,
              stationData.stationname,
              hydroId,
              'daily',
              stationData.latitude,
              stationData.longitude,
              stationData.elevation,
              new Date().toISOString(),
              stationData.stationcode,
              stationData.hydroname,
              stationData.basinid,
              stationData.basinname,
              stationData.provincecode,
              stationData.braelevel,
              stationData.QMax,
              stationData.UseMSL,
              stationData.UseMSLString,
              stationData.orderno,
              stationData.stationdetail,
              stationData.ZG,
              stationData.GroundLevel,
              locationDetails.province,
              locationDetails.amphure,
              locationDetails.tambon,
              locationDetails.formatted_address
            ]);
            logger.info(`Inserted new station: ${stationData.stationid}`, 'TelemetrySync');
          } else {
            // Update existing station if there are changes
            // First get existing station data to protect non-NULL fields
            const existingStationData = await client.query(
              'SELECT * FROM telemetry_data_stations_backup WHERE station_id = $1',
              [stationData.stationid]
            );
            const existing = existingStationData.rows[0];

            // Build update query dynamically based on non-NULL values
            const updateFields: string[] = [];
            const updateValues: any[] = [stationData.stationid];
            let paramCount = 1;

            // Helper function to check if a value should be updated
            const shouldUpdateField = (newValue: any, existingValue: any) => {
              // Don't update if new value is NULL/empty and existing value is not
              if ((newValue === null || newValue === '') && (existingValue !== null && existingValue !== '')) {
                return false;
              }
              return true;
            };

            // Check each field
            if (shouldUpdateField(stationData.stationname, existing.station_name)) {
              updateFields.push(`station_name = $${++paramCount}`);
              updateValues.push(stationData.stationname);
            }
            if (shouldUpdateField(hydroId, existing.hydro_id)) {
              updateFields.push(`hydro_id = $${++paramCount}`);
              updateValues.push(hydroId);
            }
            if (shouldUpdateField('daily', existing.data_source)) {
              updateFields.push(`data_source = $${++paramCount}`);
              updateValues.push('daily');
            }
            if (shouldUpdateField(stationData.latitude, existing.latitude)) {
              updateFields.push(`latitude = $${++paramCount}`);
              updateValues.push(stationData.latitude);
            }
            if (shouldUpdateField(stationData.longitude, existing.longitude)) {
              updateFields.push(`longitude = $${++paramCount}`);
              updateValues.push(stationData.longitude);
            }
            if (shouldUpdateField(stationData.elevation, existing.elevation)) {
              updateFields.push(`elevation = $${++paramCount}`);
              updateValues.push(stationData.elevation);
            }
            if (shouldUpdateField(new Date().toISOString(), existing.last_sync)) {
              updateFields.push(`last_sync = $${++paramCount}`);
              updateValues.push(new Date().toISOString());
            }
            if (shouldUpdateField(stationData.stationcode, existing.station_code)) {
              updateFields.push(`station_code = $${++paramCount}`);
              updateValues.push(stationData.stationcode);
            }
            if (shouldUpdateField(stationData.hydroname, existing.hydro_name)) {
              updateFields.push(`hydro_name = $${++paramCount}`);
              updateValues.push(stationData.hydroname);
            }
            if (shouldUpdateField(stationData.basinid, existing.basin_id)) {
              updateFields.push(`basin_id = $${++paramCount}`);
              updateValues.push(stationData.basinid);
            }
            if (shouldUpdateField(stationData.basinname, existing.basin_name)) {
              updateFields.push(`basin_name = $${++paramCount}`);
              updateValues.push(stationData.basinname);
            }
            if (shouldUpdateField(stationData.provincecode, existing.province_code)) {
              updateFields.push(`province_code = $${++paramCount}`);
              updateValues.push(stationData.provincecode);
            }
            if (shouldUpdateField(stationData.braelevel, existing.brae_level)) {
              updateFields.push(`brae_level = $${++paramCount}`);
              updateValues.push(stationData.braelevel);
            }
            if (shouldUpdateField(stationData.QMax, existing.q_max)) {
              updateFields.push(`q_max = $${++paramCount}`);
              updateValues.push(stationData.QMax);
            }
            if (shouldUpdateField(stationData.UseMSL, existing.use_msl)) {
              updateFields.push(`use_msl = $${++paramCount}`);
              updateValues.push(stationData.UseMSL);
            }
            if (shouldUpdateField(stationData.UseMSLString, existing.use_msl_string)) {
              updateFields.push(`use_msl_string = $${++paramCount}`);
              updateValues.push(stationData.UseMSLString);
            }
            if (shouldUpdateField(stationData.orderno, existing.order_no)) {
              updateFields.push(`order_no = $${++paramCount}`);
              updateValues.push(stationData.orderno);
            }
            if (shouldUpdateField(stationData.stationdetail, existing.station_detail)) {
              updateFields.push(`station_detail = $${++paramCount}`);
              updateValues.push(stationData.stationdetail);
            }
            if (shouldUpdateField(stationData.ZG, existing.zero_gauge)) {
              updateFields.push(`zero_gauge = $${++paramCount}`);
              updateValues.push(stationData.ZG);
            }
            if (shouldUpdateField(stationData.GroundLevel, existing.ground_level)) {
              updateFields.push(`ground_level = $${++paramCount}`);
              updateValues.push(stationData.GroundLevel);
            }

            // Always update the updated_at timestamp
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            if (updateFields.length > 0) {
              await client.query(`
                UPDATE telemetry_data_stations_backup 
                SET ${updateFields.join(', ')}
                WHERE station_id = $1
              `, updateValues);
              logger.info(`Updated existing station: ${stationData.stationid}`, 'TelemetrySync');
            } else {
              logger.info(`No updates needed for station: ${stationData.stationid}`, 'TelemetrySync');
            }
          }
        }
      }

      // Get hourly stations
      const hourlyStations = await getStationList(hydroId.toString());
      if (hourlyStations.success && Array.isArray(hourlyStations.data)) {
        for (const station of hourlyStations.data as RIDStationResponse[]) {
          // Check if station exists
          const existingStation = await client.query(
            'SELECT station_id FROM telemetry_data_stations_backup WHERE station_id = $1',
            [station.stationid]
          );

          if (existingStation.rows.length === 0) {
            // Get location details from Google Maps API
            const defaultLocationDetails: LocationDetails = {
              province: null,
              amphure: null,
              tambon: null,
              formatted_address: null
            };
            let locationDetails = defaultLocationDetails;

            if (station.latitude && station.longitude) {
              try {
                locationDetails = await getLocationDetails(
                  parseFloat(station.latitude),
                  parseFloat(station.longitude)
                );
                logger.info(`Fetched location details for station ${station.stationid}`, {
                  province: locationDetails.province,
                  amphure: locationDetails.amphure,
                  tambon: locationDetails.tambon
                });
              } catch (error) {
                logger.error(`Failed to fetch location details for station ${station.stationid}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Insert new station if it doesn't exist
            await client.query(`
              INSERT INTO telemetry_data_stations_backup (
                station_id, station_name, hydro_id, data_source,
                latitude, longitude, elevation, last_sync,
                station_code, hydro_name, basin_id, basin_name,
                province_code, brae_level, q_max, use_msl,
                use_msl_string, order_no, station_detail,
                zero_gauge, ground_level,
                province, amphure, tambon, formatted_address
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
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
              station.GroundLevel,
              locationDetails.province,
              locationDetails.amphure,
              locationDetails.tambon,
              locationDetails.formatted_address
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
    logger.info('Starting telemetry station sync', {
      timestamp: new Date().toISOString(),
      isScheduled: process.argv.includes('--scheduled')
    });

    // Run station sync
    await syncStations();
    
    // Run telemetry data sync
    await syncTelemetryData();
    
    logger.info('Telemetry sync completed successfully', {
      timestamp: new Date().toISOString()
    });

    process.exit(0);
  } catch (error) {
    logger.error('Telemetry sync failed', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
}

// Run the script
main(); 