#!/usr/bin/env ts-node

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

// Path to the CSV file
const csvFilePath = path.resolve(__dirname, '../../../telemetry-station.csv');

interface StationData {
  สถานี: string;  // station_code
  ชื่อสถานี: string;  // station_name
}

async function updateStationNames() {
  let client;
  
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as StationData[];

    logger.info(`Loaded ${records.length} records from CSV file`);

    // Connect to the database
    client = await pool.connect();
    
    // Start a transaction
    await client.query('BEGIN');
    
    let successCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;
    const errors: { station_code: string; error: string }[] = [];

    // Process each record
    for (const record of records) {
      const stationCode = record['สถานี']?.trim();
      const stationName = record['ชื่อสถานี']?.trim();
      
      if (!stationCode || !stationName) {
        logger.warn(`Skipping record with empty station code or name: ${JSON.stringify(record)}`);
        errorCount++;
        continue;
      }

      try {
        // First check if the station exists and get current name
        const checkResult = await client.query(
          'SELECT station_name FROM telemetry_data_stations WHERE station_code = $1',
          [stationCode]
        );
        
        if (checkResult.rows.length === 0) {
          logger.warn(`Station code "${stationCode}" not found in database`);
          errorCount++;
          errors.push({ station_code: stationCode, error: 'Station not found' });
          continue;
        }
        
        // Check if name already matches
        if (checkResult.rows[0].station_name === stationName) {
          logger.info(`Station "${stationCode}" already has name "${stationName}" - skipping`);
          unchangedCount++;
          continue;
        }

        // Update the station name
        const updateResult = await client.query(
          'UPDATE telemetry_data_stations SET station_name = $1, updated_at = NOW() WHERE station_code = $2 RETURNING station_id',
          [stationName, stationCode]
        );

        if (updateResult.rowCount === 0) {
          logger.warn(`Failed to update station "${stationCode}" - no rows affected`);
          errorCount++;
          errors.push({ station_code: stationCode, error: 'Update failed' });
        } else {
          logger.info(`Updated station "${stationCode}" name to "${stationName}"`);
          successCount++;
        }
      } catch (error) {
        logger.error(`Error updating station "${stationCode}": ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
        errors.push({ 
          station_code: stationCode, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // Commit the transaction
    await client.query('COMMIT');
    
    logger.info('Update summary', {
      total: records.length,
      success: successCount,
      unchanged: unchangedCount,
      errors: errorCount
    });
    
    if (errors.length > 0) {
      logger.info('Errors:', { errors });
    }

  } catch (error) {
    // Rollback on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    logger.error('Failed to update station names', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  } finally {
    // Release the client
    if (client) {
      client.release();
    }
    
    // Close the pool
    await pool.end();
  }
}

// Run the function
updateStationNames()
  .then(() => {
    logger.info('Station name update process completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Station name update process failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  });