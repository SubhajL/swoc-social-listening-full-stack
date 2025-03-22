#!/usr/bin/env node

/**
 * Get telemetry_data_stations Table Schema
 * 
 * This script retrieves and displays the schema of the telemetry_data_stations table
 * to understand its structure for updating the sync script.
 */

const path = require('path');
const dotenv = require('dotenv');
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
 * Get the schema of the telemetry_data_stations table
 */
async function getTableSchema() {
  try {
    console.log('=== telemetry_data_stations Table Schema ===\n');
    
    // Query to get column information
    const columnsQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        column_default, 
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'telemetry_data_stations'
      ORDER BY 
        ordinal_position;
    `;
    
    const columnsResult = await pool.query(columnsQuery);
    
    if (columnsResult.rows.length === 0) {
      console.log('Table telemetry_data_stations not found or has no columns.');
      return;
    }
    
    // Display column information
    console.log('Columns:');
    console.log('-'.repeat(100));
    console.log('| Column Name              | Data Type       | Length | Default                    | Nullable |');
    console.log('-'.repeat(100));
    
    for (const column of columnsResult.rows) {
      const columnName = column.column_name.padEnd(25);
      const dataType = column.data_type.padEnd(16);
      const length = (column.character_maximum_length || '').toString().padEnd(6);
      const defaultVal = (column.column_default || '').toString().substring(0, 25).padEnd(26);
      const nullable = column.is_nullable.padEnd(8);
      
      console.log(`| ${columnName} | ${dataType} | ${length} | ${defaultVal} | ${nullable} |`);
    }
    
    console.log('-'.repeat(100));
    
    // Get primary key information
    const pkQuery = `
      SELECT 
        c.column_name
      FROM 
        information_schema.table_constraints tc
      JOIN 
        information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN 
        information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name
        AND ccu.column_name = c.column_name
      WHERE 
        tc.constraint_type = 'PRIMARY KEY' 
        AND tc.table_name = 'telemetry_data_stations';
    `;
    
    const pkResult = await pool.query(pkQuery);
    
    if (pkResult.rows.length > 0) {
      console.log('\nPrimary Key:');
      console.log(pkResult.rows.map(row => row.column_name).join(', '));
    }
    
    // Get unique constraint information
    const uniqueQuery = `
      SELECT 
        tc.constraint_name,
        array_agg(ccu.column_name) as columns
      FROM 
        information_schema.table_constraints tc
      JOIN 
        information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      WHERE 
        tc.constraint_type = 'UNIQUE' 
        AND tc.table_name = 'telemetry_data_stations'
      GROUP BY
        tc.constraint_name;
    `;
    
    const uniqueResult = await pool.query(uniqueQuery);
    
    if (uniqueResult.rows.length > 0) {
      console.log('\nUnique Constraints:');
      for (const constraint of uniqueResult.rows) {
        console.log(`${constraint.constraint_name}: ${constraint.columns.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('Error retrieving table schema:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await getTableSchema();
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