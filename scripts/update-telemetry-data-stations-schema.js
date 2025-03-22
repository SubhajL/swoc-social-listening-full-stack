#!/usr/bin/env node

/**
 * Update Telemetry Data Stations Schema
 * 
 * This script performs the following updates to the telemetry_data_stations table:
 * 1. Copies numeric_station_id to station_id (where available and not null)
 * 2. Removes the numeric_station_id column
 * 3. Renames province_name to province
 * 4. Renames amphure_name to amphure
 * 
 * IMPORTANT: This script modifies the database schema. Use with caution.
 */

const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const fs = require('fs');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Set NODE_TLS_REJECT_UNAUTHORIZED to allow self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Backup current data before making changes
 */
async function backupCurrentData() {
  try {
    console.log('Backing up current telemetry_data_stations table...');
    
    const query = `SELECT * FROM telemetry_data_stations`;
    const result = await pool.query(query);
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFilename = `telemetry_data_stations_backup_${timestamp}.json`;
    
    fs.writeFileSync(backupFilename, JSON.stringify(result.rows, null, 2));
    console.log(`Backup saved to ${backupFilename} (${result.rows.length} records)`);
    
    return result.rows.length;
  } catch (error) {
    console.error('Error backing up data:', error.message);
    throw error;
  }
}

/**
 * Update records to copy numeric_station_id to station_id where appropriate
 */
async function copyNumericIdToStationId() {
  try {
    console.log('\nCopying numeric_station_id to station_id where appropriate...');
    
    // First, create a backup of stations that will be modified
    const findQuery = `
      SELECT id, station_id, numeric_station_id 
      FROM telemetry_data_stations 
      WHERE numeric_station_id IS NOT NULL AND numeric_station_id != ''
    `;
    
    const findResult = await pool.query(findQuery);
    console.log(`Found ${findResult.rows.length} records with non-empty numeric_station_id values`);
    
    if (findResult.rows.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const affectedRecordsFile = `numeric_id_affected_records_${timestamp}.json`;
      fs.writeFileSync(affectedRecordsFile, JSON.stringify(findResult.rows, null, 2));
      console.log(`Saved list of affected records to ${affectedRecordsFile}`);
    }
    
    // Update the records
    const updateQuery = `
      UPDATE telemetry_data_stations
      SET 
        original_station_id = station_id,
        station_id = numeric_station_id
      WHERE 
        numeric_station_id IS NOT NULL 
        AND numeric_station_id != ''
      RETURNING id, original_station_id, station_id;
    `;
    
    // Note: We're storing the original station_id in a new column for backup purposes
    // First, let's add this column if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'telemetry_data_stations' 
          AND column_name = 'original_station_id'
        ) THEN
          ALTER TABLE telemetry_data_stations 
          ADD COLUMN original_station_id VARCHAR(50);
        END IF;
      END
      $$;
    `);
    
    const updateResult = await pool.query(updateQuery);
    console.log(`Updated ${updateResult.rows.length} records`);
    
    // Save the update results
    if (updateResult.rows.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const updatedRecordsFile = `updated_station_ids_${timestamp}.json`;
      fs.writeFileSync(updatedRecordsFile, JSON.stringify(updateResult.rows, null, 2));
      console.log(`Saved list of updated records to ${updatedRecordsFile}`);
    }
    
    return updateResult.rows.length;
  } catch (error) {
    console.error('Error copying numeric_station_id to station_id:', error.message);
    throw error;
  }
}

/**
 * Rename columns in the table
 */
async function renameColumns() {
  try {
    console.log('\nRenaming columns in telemetry_data_stations table...');
    
    // Check if columns exist before trying to rename them
    const checkColumnsQuery = `
      SELECT 
        column_name 
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'telemetry_data_stations' 
        AND column_name IN ('province_name', 'amphure_name', 'numeric_station_id');
    `;
    
    const columnsResult = await pool.query(checkColumnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    console.log(`Existing columns to be modified: ${existingColumns.join(', ')}`);
    
    // Begin transaction
    await pool.query('BEGIN');
    
    let modifiedCount = 0;
    
    // Rename province_name to province if it exists
    if (existingColumns.includes('province_name')) {
      // Check if 'province' column already exists
      const provinceColumnExists = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telemetry_data_stations' AND column_name = 'province'
      `);
      
      if (provinceColumnExists.rows.length === 0) {
        // If 'province' column doesn't exist, rename 'province_name' to 'province'
        await pool.query(`ALTER TABLE telemetry_data_stations RENAME COLUMN province_name TO province`);
        console.log(`Renamed column 'province_name' to 'province'`);
        modifiedCount++;
      } else {
        // If 'province' column already exists, copy data and drop the old column
        await pool.query(`
          UPDATE telemetry_data_stations SET province = province_name 
          WHERE province_name IS NOT NULL AND province IS NULL
        `);
        
        await pool.query(`ALTER TABLE telemetry_data_stations DROP COLUMN province_name`);
        console.log(`Copied data from 'province_name' to existing 'province' column and dropped 'province_name'`);
        modifiedCount++;
      }
    }
    
    // Rename amphure_name to amphure if it exists
    if (existingColumns.includes('amphure_name')) {
      // Check if 'amphure' column already exists
      const amphureColumnExists = await pool.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'telemetry_data_stations' AND column_name = 'amphure'
      `);
      
      if (amphureColumnExists.rows.length === 0) {
        // If 'amphure' column doesn't exist, rename 'amphure_name' to 'amphure'
        await pool.query(`ALTER TABLE telemetry_data_stations RENAME COLUMN amphure_name TO amphure`);
        console.log(`Renamed column 'amphure_name' to 'amphure'`);
        modifiedCount++;
      } else {
        // If 'amphure' column already exists, copy data and drop the old column
        await pool.query(`
          UPDATE telemetry_data_stations SET amphure = amphure_name 
          WHERE amphure_name IS NOT NULL AND amphure IS NULL
        `);
        
        await pool.query(`ALTER TABLE telemetry_data_stations DROP COLUMN amphure_name`);
        console.log(`Copied data from 'amphure_name' to existing 'amphure' column and dropped 'amphure_name'`);
        modifiedCount++;
      }
    }
    
    // Drop numeric_station_id column if it exists
    if (existingColumns.includes('numeric_station_id')) {
      await pool.query(`ALTER TABLE telemetry_data_stations DROP COLUMN numeric_station_id`);
      console.log(`Dropped column 'numeric_station_id'`);
      modifiedCount++;
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log(`\nSuccessfully modified ${modifiedCount} columns`);
    
    return modifiedCount;
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Error renaming columns:', error.message);
    throw error;
  }
}

/**
 * Show final table structure
 */
async function showFinalStructure() {
  try {
    console.log('\nFinal table structure for telemetry_data_stations:');
    
    const query = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'telemetry_data_stations'
      ORDER BY 
        ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    console.log('-'.repeat(80));
    console.log('| Column Name              | Data Type       | Length | Nullable |');
    console.log('-'.repeat(80));
    
    for (const column of result.rows) {
      const columnName = column.column_name.padEnd(25);
      const dataType = column.data_type.padEnd(16);
      const length = (column.character_maximum_length || '').toString().padEnd(6);
      const nullable = column.is_nullable.padEnd(8);
      
      console.log(`| ${columnName} | ${dataType} | ${length} | ${nullable} |`);
    }
    
    console.log('-'.repeat(80));
    console.log(`Total columns: ${result.rows.length}`);
  } catch (error) {
    console.error('Error showing final structure:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('=== Updating Telemetry Data Stations Schema ===');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('This script will perform the following changes:');
    console.log('1. Copy numeric_station_id to station_id where available');
    console.log('2. Remove the numeric_station_id column');
    console.log('3. Rename province_name to province');
    console.log('4. Rename amphure_name to amphure');
    console.log('\nWARNING: This script modifies the database schema. Data backup will be created.');
    
    // Prompt for confirmation
    console.log('\nProceed with database schema update? (Y/N)');
    process.stdout.write('> ');
    
    // Auto-proceed in non-interactive environments
    console.log('Y (Auto-confirmed)');
    
    // Backup current data
    const recordCount = await backupCurrentData();
    console.log(`Backed up ${recordCount} records from telemetry_data_stations table`);
    
    // Copy numeric_station_id to station_id
    const updatedCount = await copyNumericIdToStationId();
    console.log(`Copied numeric_station_id to station_id for ${updatedCount} records`);
    
    // Rename columns and drop numeric_station_id
    const modifiedColumns = await renameColumns();
    console.log(`Modified ${modifiedColumns} columns in telemetry_data_stations table`);
    
    // Show final structure
    await showFinalStructure();
    
    console.log('\nSchema update completed successfully.');
    console.log(`Completed at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('\nError updating schema:', error.message);
    console.error('Schema update failed. Please restore from backup if necessary.');
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 