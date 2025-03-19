// Script to show the database structure of the thaiwater_tele_stations table
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Show the database structure of the thaiwater_tele_stations table
 */
async function showTableStructure() {
  console.log('Querying database structure of thaiwater_tele_stations table...');
  
  // Create a connection pool
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString}`);
  
  const pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Query table structure
    const tableInfoQuery = `
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length, 
        column_default, 
        is_nullable
      FROM 
        information_schema.columns
      WHERE 
        table_name = 'thaiwater_tele_stations'
      ORDER BY 
        ordinal_position;
    `;
    
    const tableInfoResult = await pool.query(tableInfoQuery);
    
    console.log(`\nTable Structure for thaiwater_tele_stations:`);
    console.log(`Found ${tableInfoResult.rows.length} columns`);
    console.log('='.repeat(80));
    
    // Format and display column information
    const columnInfo = tableInfoResult.rows.map(column => ({
      column_name: column.column_name,
      data_type: column.data_type + (column.character_maximum_length ? `(${column.character_maximum_length})` : ''),
      is_nullable: column.is_nullable,
      column_default: column.column_default
    }));
    
    console.table(columnInfo);
    
    // Query primary key information
    const primaryKeyQuery = `
      SELECT 
        c.column_name
      FROM 
        information_schema.table_constraints tc
      JOIN 
        information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN 
        information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE 
        tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = 'thaiwater_tele_stations';
    `;
    
    const primaryKeyResult = await pool.query(primaryKeyQuery);
    
    if (primaryKeyResult.rows.length > 0) {
      console.log(`\nPrimary Key: ${primaryKeyResult.rows.map(row => row.column_name).join(', ')}`);
    } else {
      console.log('\nNo Primary Key found');
    }
    
    // Query foreign key information
    const foreignKeyQuery = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
      JOIN
        information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN
        information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE
        tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'thaiwater_tele_stations';
    `;
    
    const foreignKeyResult = await pool.query(foreignKeyQuery);
    
    if (foreignKeyResult.rows.length > 0) {
      console.log('\nForeign Keys:');
      foreignKeyResult.rows.forEach(row => {
        console.log(`  ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('\nNo Foreign Keys found');
    }
    
    // Query indexes
    const indexesQuery = `
      SELECT
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        tablename = 'thaiwater_tele_stations'
      ORDER BY
        indexname;
    `;
    
    const indexesResult = await pool.query(indexesQuery);
    
    if (indexesResult.rows.length > 0) {
      console.log('\nIndexes:');
      indexesResult.rows.forEach(row => {
        console.log(`  ${row.indexname}: ${row.indexdef}`);
      });
    } else {
      console.log('\nNo Indexes found');
    }
    
    // Query sample data
    const sampleDataQuery = `
      SELECT * FROM thaiwater_tele_stations LIMIT 1;
    `;
    
    const sampleDataResult = await pool.query(sampleDataQuery);
    
    if (sampleDataResult.rows.length > 0) {
      console.log('\nSample Data:');
      console.log(JSON.stringify(sampleDataResult.rows[0], null, 2));
    }
    
    // Save structure to file
    const structureData = {
      columns: columnInfo,
      primaryKey: primaryKeyResult.rows.map(row => row.column_name),
      foreignKeys: foreignKeyResult.rows.map(row => ({
        column: row.column_name,
        foreignTable: row.foreign_table_name,
        foreignColumn: row.foreign_column_name
      })),
      indexes: indexesResult.rows.map(row => ({
        name: row.indexname,
        definition: row.indexdef
      })),
      sampleData: sampleDataResult.rows[0]
    };
    
    const structureFile = 'thaiwater_tele_stations_structure.json';
    fs.writeFileSync(structureFile, JSON.stringify(structureData, null, 2));
    console.log(`\nTable structure saved to ${structureFile}`);
    
  } catch (error) {
    console.error(`Error querying table structure: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('\nQuery completed');
  }
}

// Run the function
showTableStructure().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 