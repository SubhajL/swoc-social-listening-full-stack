#!/usr/bin/env node

/**
 * Check Duplicates in telemetry_data_stations Table
 * 
 * This script checks for different types of duplicates in the telemetry_data_stations table:
 * 1. Duplicate station_id values
 * 2. Duplicate station_code values
 * 3. Duplicate numeric_station_id values
 * 4. Duplicate combinations of these fields
 * 
 * Results are saved to JSON files and summarized in the console.
 */

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { Pool } = require('pg');

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
 * Find duplicates based on a specific column
 * @param {string} column - Column to check for duplicates
 * @param {boolean} nullCheck - Whether to include nulls in the check
 */
async function findDuplicates(column, nullCheck = false) {
  try {
    console.log(`\nChecking for duplicate ${column} values...`);

    let query;
    if (nullCheck) {
      // Include NULL values in check
      query = `
        SELECT ${column}, COUNT(*) as count, ARRAY_AGG(id) as record_ids, 
        ARRAY_AGG(station_id) as station_ids, ARRAY_AGG(station_code) as station_codes
        FROM telemetry_data_stations
        GROUP BY ${column}
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC;
      `;
    } else {
      // Exclude NULL values
      query = `
        SELECT ${column}, COUNT(*) as count, ARRAY_AGG(id) as record_ids, 
        ARRAY_AGG(station_id) as station_ids, ARRAY_AGG(station_code) as station_codes
        FROM telemetry_data_stations
        WHERE ${column} IS NOT NULL
        GROUP BY ${column}
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC;
      `;
    }

    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length} ${column} values with duplicates.`);
      
      // Save details to a file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `duplicate_${column}_${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(result.rows, null, 2));
      console.log(`Detailed results saved to ${filename}`);
      
      // Display summary
      console.log('Top 5 duplicates:');
      for (let i = 0; i < Math.min(5, result.rows.length); i++) {
        const row = result.rows[i];
        console.log(`- ${column}: ${row[column]}, ${row.count} occurrences, IDs: ${row.record_ids.slice(0, 3).join(', ')}${row.record_ids.length > 3 ? '...' : ''}`);
      }
    } else {
      console.log(`No duplicates found for ${column}.`);
    }
    
    return result.rows;
  } catch (error) {
    console.error(`Error checking for duplicate ${column}:`, error.message);
    return [];
  }
}

/**
 * Find duplicate combinations of columns
 * @param {Array<string>} columns - Columns to check for duplicates
 */
async function findDuplicateCombinations(columns) {
  try {
    const columnList = columns.join(', ');
    console.log(`\nChecking for duplicate combinations of ${columnList}...`);

    const query = `
      SELECT ${columnList}, COUNT(*) as count, ARRAY_AGG(id) as record_ids
      FROM telemetry_data_stations
      WHERE ${columns.map(col => `${col} IS NOT NULL`).join(' AND ')}
      GROUP BY ${columnList}
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC;
    `;

    const result = await pool.query(query);
    
    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length} combinations with duplicates.`);
      
      // Save details to a file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `duplicate_combination_${columns.join('_')}_${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(result.rows, null, 2));
      console.log(`Detailed results saved to ${filename}`);
      
      // Display summary
      console.log('Top 5 duplicate combinations:');
      for (let i = 0; i < Math.min(5, result.rows.length); i++) {
        const row = result.rows[i];
        console.log(`- Combination: ${columns.map(col => `${col}=${row[col]}`).join(', ')}`);
        console.log(`  ${row.count} occurrences, IDs: ${row.record_ids.slice(0, 3).join(', ')}${row.record_ids.length > 3 ? '...' : ''}`);
      }
    } else {
      console.log(`No duplicate combinations found for ${columnList}.`);
    }
    
    return result.rows;
  } catch (error) {
    console.error(`Error checking for duplicate combinations:`, error.message);
    return [];
  }
}

/**
 * Get the total count of records in the table
 */
async function getTotalRecordCount() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM telemetry_data_stations');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting total record count:', error.message);
    return 0;
  }
}

/**
 * Run all duplicate checks
 */
async function main() {
  try {
    console.log('=== Checking for Duplicates in telemetry_data_stations ===');
    
    // Get total record count
    const totalRecords = await getTotalRecordCount();
    console.log(`Total records in telemetry_data_stations table: ${totalRecords}`);
    
    // Check for duplicates in individual columns
    const duplicateIds = await findDuplicates('station_id');
    const duplicateCodes = await findDuplicates('station_code');
    const duplicateNumericIds = await findDuplicates('numeric_station_id');
    
    // Check for duplicate combinations
    const duplicateIdCode = await findDuplicateCombinations(['station_id', 'station_code']);
    const duplicateIdNumeric = await findDuplicateCombinations(['station_id', 'numeric_station_id']);
    const duplicateCodeNumeric = await findDuplicateCombinations(['station_code', 'numeric_station_id']);
    
    // Check for complete duplicates (all three fields)
    const completelyDuplicate = await findDuplicateCombinations([
      'station_id', 'station_code', 'numeric_station_id'
    ]);
    
    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total records: ${totalRecords}`);
    console.log(`Records with duplicate station_id: ${duplicateIds.reduce((sum, row) => sum + row.count, 0) - duplicateIds.length}`);
    console.log(`Records with duplicate station_code: ${duplicateCodes.reduce((sum, row) => sum + row.count, 0) - duplicateCodes.length}`);
    console.log(`Records with duplicate numeric_station_id: ${duplicateNumericIds.reduce((sum, row) => sum + row.count, 0) - duplicateNumericIds.length}`);
    
    // Complete summary
    const allDuplicateResults = {
      total_records: totalRecords,
      duplicate_station_id: {
        count: duplicateIds.length,
        affected_records: duplicateIds.reduce((sum, row) => sum + row.count, 0)
      },
      duplicate_station_code: {
        count: duplicateCodes.length,
        affected_records: duplicateCodes.reduce((sum, row) => sum + row.count, 0)
      },
      duplicate_numeric_station_id: {
        count: duplicateNumericIds.length,
        affected_records: duplicateNumericIds.reduce((sum, row) => sum + row.count, 0)
      },
      duplicate_id_code_combo: {
        count: duplicateIdCode.length,
        affected_records: duplicateIdCode.reduce((sum, row) => sum + row.count, 0)
      },
      duplicate_id_numeric_combo: {
        count: duplicateIdNumeric.length,
        affected_records: duplicateIdNumeric.reduce((sum, row) => sum + row.count, 0)
      },
      duplicate_code_numeric_combo: {
        count: duplicateCodeNumeric.length,
        affected_records: duplicateCodeNumeric.reduce((sum, row) => sum + row.count, 0)
      },
      complete_duplicates: {
        count: completelyDuplicate.length,
        affected_records: completelyDuplicate.reduce((sum, row) => sum + row.count, 0)
      }
    };
    
    // Save summary to file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const summaryFilename = `duplicate_summary_${timestamp}.json`;
    fs.writeFileSync(summaryFilename, JSON.stringify(allDuplicateResults, null, 2));
    console.log(`\nComplete summary saved to ${summaryFilename}`);
    
  } catch (error) {
    console.error('Error in main function:', error.message);
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