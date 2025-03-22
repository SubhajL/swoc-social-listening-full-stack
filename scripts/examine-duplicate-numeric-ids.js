#!/usr/bin/env node

/**
 * Examine Duplicate numeric_station_id Records
 * 
 * This script examines the details of records with duplicate numeric_station_id values
 * in the telemetry_data_stations table. It provides a detailed report of these records
 * including all their fields for comparison.
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
 * Get detailed information for records with duplicate numeric_station_id
 */
async function getDuplicateNumericIdDetails() {
  try {
    console.log('\nFetching details of records with duplicate numeric_station_id values...');

    // First identify the duplicate numeric_station_id values
    const findDuplicatesQuery = `
      SELECT numeric_station_id, COUNT(*), ARRAY_AGG(id) as record_ids
      FROM telemetry_data_stations
      WHERE numeric_station_id IS NOT NULL
      GROUP BY numeric_station_id
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, numeric_station_id;
    `;

    const duplicatesResult = await pool.query(findDuplicatesQuery);
    
    if (duplicatesResult.rows.length === 0) {
      console.log('No duplicate numeric_station_id values found.');
      return [];
    }

    console.log(`Found ${duplicatesResult.rows.length} numeric_station_id values with duplicates.`);
    
    // For each duplicate value, get the full record details
    const allDuplicateDetails = [];
    
    for (const dupRow of duplicatesResult.rows) {
      const numericId = dupRow.numeric_station_id;
      const recordIds = dupRow.record_ids;
      
      console.log(`\nExamining records with numeric_station_id = ${numericId}:`);
      console.log(`Record IDs: ${recordIds.join(', ')}`);
      
      // Get full details of these records
      const detailsQuery = `
        SELECT *
        FROM telemetry_data_stations
        WHERE numeric_station_id = $1
        ORDER BY id;
      `;
      
      const detailsResult = await pool.query(detailsQuery, [numericId]);
      
      console.log(`\nDetails for ${detailsResult.rows.length} records with numeric_station_id = ${numericId}:`);
      
      // Display a summary of each record
      detailsResult.rows.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  station_id: ${record.station_id}`);
        console.log(`  station_code: ${record.station_code}`);
        console.log(`  station_name: ${record.station_name}`);
        console.log(`  numeric_station_id: ${record.numeric_station_id}`);
        console.log(`  numeric_station_id_suffix: ${record.numeric_station_id_suffix}`);
        console.log(`  show_hourly_report: ${record.show_hourly_report}`);
        console.log(`  show_daily_report: ${record.show_daily_report}`);
        console.log(`  status: ${record.status}`);
        console.log(`  created_at: ${record.created_at}`);
        console.log(`  updated_at: ${record.updated_at}`);
      });
      
      // Add to our collection of all duplicate details
      allDuplicateDetails.push({
        numeric_station_id: numericId,
        record_count: detailsResult.rows.length,
        records: detailsResult.rows
      });
    }
    
    // Save the detailed results to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `duplicate_numeric_id_details_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(allDuplicateDetails, null, 2));
    console.log(`\nDetailed results saved to ${filename}`);
    
    return allDuplicateDetails;
  } catch (error) {
    console.error('Error fetching duplicate details:', error.message);
    return [];
  }
}

/**
 * Check for any other potential duplicates or issues
 */
async function checkForOtherIssues() {
  try {
    console.log('\nChecking for other potential duplicate issues...');
    
    // Check for similar station IDs with different letter case
    const caseQuery = `
      SELECT LOWER(station_id) as lower_id, 
             COUNT(*) as count,
             ARRAY_AGG(id || ':' || station_id) as record_details
      FROM telemetry_data_stations
      GROUP BY LOWER(station_id)
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC;
    `;
    
    const caseResult = await pool.query(caseQuery);
    
    if (caseResult.rows.length > 0) {
      console.log(`Found ${caseResult.rows.length} station IDs with case variations.`);
      
      caseResult.rows.forEach(row => {
        console.log(`- "${row.lower_id}" has ${row.count} variations: ${row.record_details.join(', ')}`);
      });
      
      // Save to file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `case_sensitive_duplicates_${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(caseResult.rows, null, 2));
    } else {
      console.log('No case-sensitive duplicate station IDs found.');
    }
    
    // Check for station IDs with trailing or leading spaces
    const spacesQuery = `
      SELECT id, station_id, length(station_id) as length, length(trim(station_id)) as trimmed_length,
             station_code, numeric_station_id
      FROM telemetry_data_stations
      WHERE length(station_id) <> length(trim(station_id))
      ORDER BY id;
    `;
    
    const spacesResult = await pool.query(spacesQuery);
    
    if (spacesResult.rows.length > 0) {
      console.log(`\nFound ${spacesResult.rows.length} station IDs with extra spaces:`);
      
      spacesResult.rows.forEach(row => {
        console.log(`- ID ${row.id}: "${row.station_id}" (length: ${row.length}, trimmed: ${row.trimmed_length})`);
      });
      
      // Save to file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `whitespace_issues_${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(spacesResult.rows, null, 2));
    } else {
      console.log('\nNo station IDs with extra spaces found.');
    }
    
    return {
      case_variations: caseResult.rows,
      whitespace_issues: spacesResult.rows
    };
  } catch (error) {
    console.error('Error checking for other issues:', error.message);
    return { case_variations: [], whitespace_issues: [] };
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    console.log('=== Examining Duplicate Records in telemetry_data_stations ===');
    
    // Get details of records with duplicate numeric_station_id
    const duplicateDetails = await getDuplicateNumericIdDetails();
    
    // Check for other potential issues
    const otherIssues = await checkForOtherIssues();
    
    // Create a comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      duplicate_numeric_ids: {
        count: duplicateDetails.length,
        details: duplicateDetails
      },
      other_issues: otherIssues
    };
    
    // Save comprehensive report
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportFilename = `duplicate_comprehensive_report_${timestamp}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    console.log(`\nComprehensive report saved to ${reportFilename}`);
    
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