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

// Mock stations for testing (empty array)
const mockStations: RIDStationResponse[] = [];

// Thai province mapping
const provinceMapping: Record<string, string> = {
  'Bangkok': 'กรุงเทพมหานคร',
  'Chiang Mai': 'เชียงใหม่',
  'Phuket': 'ภูเก็ต',
  'Chonburi': 'ชลบุรี',
  'Krabi': 'กระบี่',
  'Chiang Rai': 'เชียงราย',
  'Songkhla': 'สงขลา',
  'Udon Thani': 'อุดรธานี',
  'Sukhothai': 'สุโขทัย',
  'Ayutthaya': 'พระนครศรีอยุธยา'
};

function formatThaiProvince(province: string | null): string | null {
  if (!province) return null;
  province = province.trim();
  
  // Remove จังหวัด prefix if present
  province = province.replace(/^จังหวัด\s*/i, '');
  
  // Special cases for Bangkok
  if (province.toLowerCase() === 'bangkok' || province.toLowerCase() === 'กรุงเทพมหานคร') {
    return 'กรุงเทพมหานคร';
  }
  
  // Ensure the province name is in Thai
  if (!/[\u0E00-\u0E7F]/.test(province)) {
    logger.warn('Province name not in Thai script, skipping formatting', { province });
    return null;
  }
  
  return province;
}

function formatThaiAmphure(amphure: string | null, province: string | null): string | null {
  if (!amphure) return null;
  amphure = amphure.trim();
  
  // Ensure the amphure name is in Thai
  if (!/[\u0E00-\u0E7F]/.test(amphure)) {
    logger.warn('Amphure name not in Thai script, skipping formatting', { amphure });
    return null;
  }
  
  // For Bangkok, remove เขต prefix
  if (province === 'กรุงเทพมหานคร') {
    return amphure.replace(/^เขต\s*/i, '');
  }
  
  // For other provinces, remove อำเภอ prefix
  return amphure.replace(/^อำเภอ\s*/i, '');
}

function formatStationLocationData(locationDetails: LocationDetails): LocationDetails {
  const formattedProvince = formatThaiProvince(locationDetails.province);
  const formattedAmphure = formatThaiAmphure(locationDetails.amphure, formattedProvince);
  
  // Log the formatting results
  logger.info('Location formatting results', {
    original: locationDetails,
    formatted: {
      province: formattedProvince,
      amphure: formattedAmphure
    }
  });
  
  return {
    province: formattedProvince,
    amphure: formattedAmphure,
    formatted_address: locationDetails.formatted_address
  };
}

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
        // Add mock stations in test mode
        if (process.env.TEST_MODE === 'true') {
          logger.info('Test mode enabled - adding mock stations', 'TelemetrySync');
          // Create a mock station response that matches the API response structure
          const mockStationResponse = {
            success: true,
            data: mockStations
          };
          // Process the mock stations
          for (const station of mockStationResponse.data) {
            const stationData = station as unknown as RIDStationResponse;
            
            // Check if station exists
            const existingStation = await client.query(
              'SELECT station_id FROM telemetry_data_stations WHERE station_id = $1',
              [stationData.stationid]
            );

            if (existingStation.rows.length === 0) {
              // Get location details from Google Maps API
              const defaultLocationDetails: LocationDetails = {
                province: null,
                amphure: null,
                formatted_address: null
              };
              let locationDetails = defaultLocationDetails;

              if (stationData.latitude && stationData.longitude) {
                try {
                  locationDetails = await getLocationDetails(
                    parseFloat(stationData.latitude),
                    parseFloat(stationData.longitude)
                  );
                  // Format Thai text
                  const formattedLocationDetails = formatStationLocationData(locationDetails);
                  
                  logger.info(`Fetched location details for station ${stationData.stationid}`, formattedLocationDetails);
                  
                  // Update locationDetails with formatted values
                  locationDetails = formattedLocationDetails;
                } catch (error) {
                  logger.error(`Failed to fetch location details for station ${stationData.stationid}`, {
                    error: error instanceof Error ? error.message : String(error)
                  });
                }
              }

              // Insert new station if it doesn't exist
              const insertQuery = `
                INSERT INTO telemetry_data_stations (
                  station_id, station_code, station_name, station_detail,
                  hydro_id, hydro_name, basin_id, basin_name,
                  province_code, province, amphure_code, amphure,
                  latitude, longitude, ground_level, q_max,
                  zg, brae_level, use_msl, use_q_auto,
                  telemetry_id, telemetry_source,
                  show_hourly_report, show_daily_report,
                  is_warning, status, notes, data_source,
                  category, has_data
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                  $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
                )
              `;
              const values = [
                stationData.stationid,                               // station_id
                stationData.stationcode,                            // station_code
                stationData.stationname,                            // station_name
                stationData.stationdetail,                          // station_detail
                parseInt(stationData.hydroid || '0', 10),           // hydro_id
                stationData.hydroname,                              // hydro_name
                parseInt(stationData.basinid || '0', 10),           // basin_id
                stationData.basinname,                              // basin_name
                parseInt(stationData.provincecode || '0', 10),      // province_code
                locationDetails.province,                           // province
                null,                                               // amphure_code
                locationDetails.amphure,                            // amphure
                parseFloat(stationData.latitude || '0'),            // latitude
                parseFloat(stationData.longitude || '0'),           // longitude
                parseFloat(stationData.GroundLevel || '0'),         // ground_level
                parseFloat(stationData.QMax || '0'),                // q_max
                parseFloat(stationData.ZG || '0'),                  // zg
                parseFloat(stationData.braelevel || '0'),           // brae_level
                stationData.UseMSL === '1',                         // use_msl
                stationData.UseQAuto === '1',                       // use_q_auto
                parseInt(stationData.telemetryid || '0', 10),       // telemetry_id
                stationData.telemetrysource || null,                // telemetry_source
                true,                                               // show_hourly_report
                true,                                               // show_daily_report
                false,                                              // is_warning
                'active',                                           // status
                null,                                               // notes
                'RID',                                             // data_source
                'Common',                                           // category
                true                                                // has_data
              ];
              await client.query(insertQuery, values);
              logger.info(`Inserted new station: ${stationData.stationid}`, 'TelemetrySync');
            } else {
              // Update existing station with new data from RID API
              // Get location details from Google Maps API
              const defaultLocationDetails: LocationDetails = {
                province: null,
                amphure: null,
                formatted_address: null
              };
              let locationDetails = defaultLocationDetails;

              if (stationData.latitude && stationData.longitude) {
                try {
                  locationDetails = await getLocationDetails(
                    parseFloat(stationData.latitude),
                    parseFloat(stationData.longitude)
                  );
                  // Format Thai text
                  const formattedLocationDetails = formatStationLocationData(locationDetails);
                  
                  logger.info(`Fetched location details for station ${stationData.stationid}`, formattedLocationDetails);
                  
                  // Update locationDetails with formatted values
                  locationDetails = formattedLocationDetails;
                } catch (error) {
                  logger.error(`Failed to fetch location details for station ${stationData.stationid}`, {
                    error: error instanceof Error ? error.message : String(error)
                  });
                }
              }

              const updateQuery = `
                UPDATE telemetry_data_stations 
                SET 
                  station_code = $2,
                  station_name = $3,
                  station_detail = $4,
                  hydro_id = $5,
                  hydro_name = $6,
                  basin_id = $7,
                  basin_name = $8,
                  province_code = $9,
                  province = $10,
                  amphure = $11,
                  latitude = $12,
                  longitude = $13,
                  ground_level = $14,
                  q_max = $15,
                  zg = $16,
                  brae_level = $17,
                  use_msl = $18,
                  use_q_auto = $19,
                  telemetry_id = $20,
                  telemetry_source = $21,
                  show_hourly_report = $22,
                  show_daily_report = $23,
                  updated_at = $24
                WHERE station_id = $1
              `;
              const values = [
                stationData.stationid,                               // station_id
                stationData.stationcode,                            // station_code
                stationData.stationname,                            // station_name
                stationData.stationdetail,                          // station_detail
                parseInt(stationData.hydroid || '0', 10),           // hydro_id
                stationData.hydroname,                              // hydro_name
                parseInt(stationData.basinid || '0', 10),           // basin_id
                stationData.basinname,                              // basin_name
                parseInt(stationData.provincecode || '0', 10),      // province_code
                locationDetails.province,                           // province
                locationDetails.amphure,                            // amphure
                parseFloat(stationData.latitude || '0'),            // latitude
                parseFloat(stationData.longitude || '0'),           // longitude
                parseFloat(stationData.GroundLevel || '0'),         // ground_level
                parseFloat(stationData.QMax || '0'),                // q_max
                parseFloat(stationData.ZG || '0'),                  // zg
                parseFloat(stationData.braelevel || '0'),           // brae_level
                stationData.UseMSL === '1',                         // use_msl
                stationData.UseQAuto === '1',                       // use_q_auto
                parseInt(stationData.telemetryid || '0', 10),       // telemetry_id
                stationData.telemetrysource || null,                // telemetry_source
                true,                                               // show_hourly_report
                true,                                               // show_daily_report
                new Date().toISOString()                            // updated_at
              ];
              await client.query(updateQuery, values);
              logger.info(`Updated existing station: ${stationData.stationid}`, 'TelemetrySync');
            }
          }
        }

        // Process regular stations
        for (const station of dailyStations.data) {
          // Type assertion to handle the API response
          const stationData = station as unknown as RIDStationResponse;
          
          // Check if station exists
          const existingStation = await client.query(
            'SELECT station_id FROM telemetry_data_stations WHERE station_id = $1',
            [stationData.stationid]
          );

          if (existingStation.rows.length === 0) {
            // Get location details from Google Maps API
            const defaultLocationDetails: LocationDetails = {
              province: null,
              amphure: null,
              formatted_address: null
            };
            let locationDetails = defaultLocationDetails;

            if (stationData.latitude && stationData.longitude) {
              try {
                locationDetails = await getLocationDetails(
                  parseFloat(stationData.latitude),
                  parseFloat(stationData.longitude)
                );
                // Format Thai text
                const formattedLocationDetails = formatStationLocationData(locationDetails);
                
                logger.info(`Fetched location details for station ${stationData.stationid}`, formattedLocationDetails);
                
                // Update locationDetails with formatted values
                locationDetails = formattedLocationDetails;
              } catch (error) {
                logger.error(`Failed to fetch location details for station ${stationData.stationid}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Insert new station if it doesn't exist
            const insertQuery = `
              INSERT INTO telemetry_data_stations (
                station_id, station_code, station_name, station_detail,
                hydro_id, hydro_name, basin_id, basin_name,
                province_code, province, amphure_code, amphure,
                latitude, longitude, ground_level, q_max,
                zg, brae_level, use_msl, use_q_auto,
                telemetry_id, telemetry_source,
                show_hourly_report, show_daily_report,
                is_warning, status, notes, data_source,
                category, has_data
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
              )
            `;
            const values = [
              stationData.stationid,                               // station_id
              stationData.stationcode,                            // station_code
              stationData.stationname,                            // station_name
              stationData.stationdetail,                          // station_detail
              parseInt(stationData.hydroid || '0', 10),           // hydro_id
              stationData.hydroname,                              // hydro_name
              parseInt(stationData.basinid || '0', 10),           // basin_id
              stationData.basinname,                              // basin_name
              parseInt(stationData.provincecode || '0', 10),      // province_code
              locationDetails.province,                           // province
              null,                                               // amphure_code
              locationDetails.amphure,                            // amphure
              parseFloat(stationData.latitude || '0'),            // latitude
              parseFloat(stationData.longitude || '0'),           // longitude
              parseFloat(stationData.GroundLevel || '0'),         // ground_level
              parseFloat(stationData.QMax || '0'),                // q_max
              parseFloat(stationData.ZG || '0'),                  // zg
              parseFloat(stationData.braelevel || '0'),           // brae_level
              stationData.UseMSL === '1',                         // use_msl
              stationData.UseQAuto === '1',                       // use_q_auto
              parseInt(stationData.telemetryid || '0', 10),       // telemetry_id
              stationData.telemetrysource || null,                // telemetry_source
              true,                                               // show_hourly_report
              true,                                               // show_daily_report
              false,                                              // is_warning
              'active',                                           // status
              null,                                               // notes
              'RID',                                             // data_source
              'Common',                                           // category
              true                                                // has_data
            ];
            await client.query(insertQuery, values);
            logger.info(`Inserted new station: ${stationData.stationid}`, 'TelemetrySync');
          } else {
            // Update existing station with new data from RID API
            // Get location details from Google Maps API
            const defaultLocationDetails: LocationDetails = {
              province: null,
              amphure: null,
              formatted_address: null
            };
            let locationDetails = defaultLocationDetails;

            if (stationData.latitude && stationData.longitude) {
              try {
                locationDetails = await getLocationDetails(
                  parseFloat(stationData.latitude),
                  parseFloat(stationData.longitude)
                );
                // Format Thai text
                const formattedLocationDetails = formatStationLocationData(locationDetails);
                
                logger.info(`Fetched location details for station ${stationData.stationid}`, formattedLocationDetails);
                
                // Update locationDetails with formatted values
                locationDetails = formattedLocationDetails;
              } catch (error) {
                logger.error(`Failed to fetch location details for station ${stationData.stationid}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            const updateQuery = `
              UPDATE telemetry_data_stations 
              SET 
                station_code = $2,
                station_name = $3,
                station_detail = $4,
                hydro_id = $5,
                hydro_name = $6,
                basin_id = $7,
                basin_name = $8,
                province_code = $9,
                province = $10,
                amphure = $11,
                latitude = $12,
                longitude = $13,
                ground_level = $14,
                q_max = $15,
                zg = $16,
                brae_level = $17,
                use_msl = $18,
                use_q_auto = $19,
                telemetry_id = $20,
                telemetry_source = $21,
                show_hourly_report = $22,
                show_daily_report = $23,
                updated_at = $24
              WHERE station_id = $1
            `;
            const values = [
              stationData.stationid,                               // station_id
              stationData.stationcode,                            // station_code
              stationData.stationname,                            // station_name
              stationData.stationdetail,                          // station_detail
              parseInt(stationData.hydroid || '0', 10),           // hydro_id
              stationData.hydroname,                              // hydro_name
              parseInt(stationData.basinid || '0', 10),           // basin_id
              stationData.basinname,                              // basin_name
              parseInt(stationData.provincecode || '0', 10),      // province_code
              locationDetails.province,                           // province
              locationDetails.amphure,                            // amphure
              parseFloat(stationData.latitude || '0'),            // latitude
              parseFloat(stationData.longitude || '0'),           // longitude
              parseFloat(stationData.GroundLevel || '0'),         // ground_level
              parseFloat(stationData.QMax || '0'),                // q_max
              parseFloat(stationData.ZG || '0'),                  // zg
              parseFloat(stationData.braelevel || '0'),           // brae_level
              stationData.UseMSL === '1',                         // use_msl
              stationData.UseQAuto === '1',                       // use_q_auto
              parseInt(stationData.telemetryid || '0', 10),       // telemetry_id
              stationData.telemetrysource || null,                // telemetry_source
              true,                                               // show_hourly_report
              true,                                               // show_daily_report
              new Date().toISOString()                            // updated_at
            ];
            await client.query(updateQuery, values);
            logger.info(`Updated existing station: ${stationData.stationid}`, 'TelemetrySync');
          }
        }
      }

      // Get hourly stations
      const hourlyStations = await getStationList(hydroId.toString());
      if (hourlyStations.success && Array.isArray(hourlyStations.data)) {
        for (const station of hourlyStations.data as RIDStationResponse[]) {
          // Check if station exists
          const existingStation = await client.query(
            'SELECT station_id FROM telemetry_data_stations WHERE station_id = $1',
            [station.stationid]
          );

          if (existingStation.rows.length === 0) {
            // Get location details from Google Maps API
            const defaultLocationDetails: LocationDetails = {
              province: null,
              amphure: null,
              formatted_address: null
            };
            let locationDetails = defaultLocationDetails;

            if (station.latitude && station.longitude) {
              try {
                locationDetails = await getLocationDetails(
                  parseFloat(station.latitude),
                  parseFloat(station.longitude)
                );
                // Format Thai text
                const formattedLocationDetails = formatStationLocationData(locationDetails);
                
                logger.info(`Fetched location details for station ${station.stationid}`, formattedLocationDetails);
                
                // Update locationDetails with formatted values
                locationDetails = formattedLocationDetails;
              } catch (error) {
                logger.error(`Failed to fetch location details for station ${station.stationid}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            // Insert new station if it doesn't exist
            const insertQuery = `
              INSERT INTO telemetry_data_stations (
                station_id, station_code, station_name, station_detail,
                hydro_id, hydro_name, basin_id, basin_name,
                province_code, province, amphure_code, amphure,
                latitude, longitude, ground_level, q_max,
                zg, brae_level, use_msl, use_q_auto,
                telemetry_id, telemetry_source,
                show_hourly_report, show_daily_report,
                is_warning, status, notes, data_source,
                category, has_data
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
              )
            `;
            const values = [
              station.stationid,                               // station_id
              station.stationcode,                            // station_code
              station.stationname,                            // station_name
              station.stationdetail,                          // station_detail
              parseInt(station.hydroid || '0', 10),           // hydro_id
              station.hydroname,                              // hydro_name
              parseInt(station.basinid || '0', 10),           // basin_id
              station.basinname,                              // basin_name
              parseInt(station.provincecode || '0', 10),      // province_code
              locationDetails.province,                           // province
              null,                                               // amphure_code
              locationDetails.amphure,                            // amphure
              parseFloat(station.latitude || '0'),            // latitude
              parseFloat(station.longitude || '0'),           // longitude
              parseFloat(station.GroundLevel || '0'),         // ground_level
              parseFloat(station.QMax || '0'),                // q_max
              parseFloat(station.ZG || '0'),                  // zg
              parseFloat(station.braelevel || '0'),           // brae_level
              station.UseMSL === '1',                         // use_msl
              station.UseQAuto === '1',                       // use_q_auto
              parseInt(station.telemetryid || '0', 10),       // telemetry_id
              station.telemetrysource || null,                // telemetry_source
              true,                                               // show_hourly_report
              true,                                               // show_daily_report
              false,                                              // is_warning
              'active',                                           // status
              null,                                               // notes
              'RID',                                             // data_source
              'Common',                                           // category
              true                                                // has_data
            ];
            await client.query(insertQuery, values);
            logger.info(`Inserted new station: ${station.stationid}`, 'TelemetrySync');
          } else {
            // Update existing station with new data from RID API
            // Get location details from Google Maps API
            const defaultLocationDetails: LocationDetails = {
              province: null,
              amphure: null,
              formatted_address: null
            };
            let locationDetails = defaultLocationDetails;

            if (station.latitude && station.longitude) {
              try {
                locationDetails = await getLocationDetails(
                  parseFloat(station.latitude),
                  parseFloat(station.longitude)
                );
                // Format Thai text
                const formattedLocationDetails = formatStationLocationData(locationDetails);
                
                logger.info(`Fetched location details for station ${station.stationid}`, formattedLocationDetails);
                
                // Update locationDetails with formatted values
                locationDetails = formattedLocationDetails;
              } catch (error) {
                logger.error(`Failed to fetch location details for station ${station.stationid}`, {
                  error: error instanceof Error ? error.message : String(error)
                });
              }
            }

            const updateQuery = `
              UPDATE telemetry_data_stations 
              SET 
                station_code = $2,
                station_name = $3,
                station_detail = $4,
                hydro_id = $5,
                hydro_name = $6,
                basin_id = $7,
                basin_name = $8,
                province_code = $9,
                province = $10,
                amphure = $11,
                latitude = $12,
                longitude = $13,
                ground_level = $14,
                q_max = $15,
                zg = $16,
                brae_level = $17,
                use_msl = $18,
                use_q_auto = $19,
                telemetry_id = $20,
                telemetry_source = $21,
                show_hourly_report = $22,
                show_daily_report = $23,
                updated_at = $24
              WHERE station_id = $1
            `;
            const values = [
              station.stationid,                               // station_id
              station.stationcode,                            // station_code
              station.stationname,                            // station_name
              station.stationdetail,                          // station_detail
              parseInt(station.hydroid || '0', 10),           // hydro_id
              station.hydroname,                              // hydro_name
              parseInt(station.basinid || '0', 10),           // basin_id
              station.basinname,                              // basin_name
              parseInt(station.provincecode || '0', 10),      // province_code
              locationDetails.province,                           // province
              locationDetails.amphure,                            // amphure
              parseFloat(station.latitude || '0'),            // latitude
              parseFloat(station.longitude || '0'),           // longitude
              parseFloat(station.GroundLevel || '0'),         // ground_level
              parseFloat(station.QMax || '0'),                // q_max
              parseFloat(station.ZG || '0'),                  // zg
              parseFloat(station.braelevel || '0'),           // brae_level
              station.UseMSL === '1',                         // use_msl
              station.UseQAuto === '1',                       // use_q_auto
              parseInt(station.telemetryid || '0', 10),       // telemetry_id
              station.telemetrysource || null,                // telemetry_source
              true,                                               // show_hourly_report
              true,                                               // show_daily_report
              new Date().toISOString()                            // updated_at
            ];
            await client.query(updateQuery, values);
            logger.info(`Updated existing station: ${station.stationid}`, 'TelemetrySync');
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