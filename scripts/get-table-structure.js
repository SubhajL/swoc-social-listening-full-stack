/**
 * Script to get the structure of the telemetry_data_stations table in PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Get the structure of the telemetry_data_stations table
 */
async function getTableStructure() {
  try {
    const client = await pool.connect();
    
    try {
      console.log('Getting structure of telemetry_data_stations table...');
      
      // SQL query to get table columns and their data types
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
      
      // SQL query to get table constraints (primary keys, foreign keys, etc.)
      const constraintsQuery = `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM
          information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE
          tc.table_name = 'telemetry_data_stations'
        ORDER BY
          tc.constraint_name;
      `;
      
      // SQL query to get table indexes
      const indexesQuery = `
        SELECT
          indexname,
          indexdef
        FROM
          pg_indexes
        WHERE
          tablename = 'telemetry_data_stations'
        ORDER BY
          indexname;
      `;
      
      // Execute the queries
      const columnsResult = await client.query(columnsQuery);
      const constraintsResult = await client.query(constraintsQuery);
      const indexesResult = await client.query(indexesQuery);
      
      // Print column information
      console.log('\n==== COLUMNS ====');
      console.log('Column Name\tData Type\tLength\tNullable\tDefault');
      console.log('-'.repeat(100));
      
      columnsResult.rows.forEach(row => {
        const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`${row.column_name}\t${row.data_type}${length}\t${row.is_nullable}\t${row.column_default || 'null'}`);
      });
      
      // Print constraint information
      console.log('\n==== CONSTRAINTS ====');
      console.log('Constraint Name\tType\tColumn\tReferences');
      console.log('-'.repeat(100));
      
      constraintsResult.rows.forEach(row => {
        const references = row.foreign_table_name ? `${row.foreign_table_name}(${row.foreign_column_name})` : 'N/A';
        console.log(`${row.constraint_name}\t${row.constraint_type}\t${row.column_name}\t${references}`);
      });
      
      // Print index information
      console.log('\n==== INDEXES ====');
      console.log('Index Name\tDefinition');
      console.log('-'.repeat(100));
      
      indexesResult.rows.forEach(row => {
        console.log(`${row.indexname}\t${row.indexdef}`);
      });
      
      // Save results to JSON file
      const result = {
        columns: columnsResult.rows,
        constraints: constraintsResult.rows,
        indexes: indexesResult.rows
      };
      
      const outputFile = 'table_structure.json';
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nResults saved to ${outputFile}`);
      
      return result;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting table structure:', error);
    return null;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the function
getTableStructure().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 