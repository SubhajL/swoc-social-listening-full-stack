// Script to check if specific tables exist in the database
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkTables() {
  console.log('Checking for existence of rainfall tables...');
  
  // Get connection string from environment variable
  const connectionString = process.env.DATABASE_URL;
  console.log(`Using connection string: ${connectionString ? 'Valid connection string found' : 'undefined - check .env file'}`);
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not found. Make sure the .env file exists and contains DATABASE_URL.');
  }
  
  const pool = new pg.Pool({
    connectionString,
    // Don't use SSL for local connections
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Check if tables exist
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%rainfall%'
      ORDER BY table_name;
    `;
    
    const result = await pool.query(query);
    
    console.log(`\nFound ${result.rowCount} tables with 'rainfall' in their name:`);
    if (result.rowCount > 0) {
      console.table(result.rows);
    } else {
      console.log("No tables found with 'rainfall' in their name.");
    }
    
    // Check for specific tables
    const tables = [
      'rainfall_data_thaiwater',
      'thaiwater_rainfall_data',
      'thaiwater_rainfall_data_new'
    ];
    
    for (const table of tables) {
      const tableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists;
      `;
      
      const tableResult = await pool.query(tableQuery, [table]);
      console.log(`Table '${table}' exists: ${tableResult.rows[0].exists}`);
      
      if (tableResult.rows[0].exists) {
        // If table exists, get the count of records
        const countQuery = `SELECT COUNT(*) as count FROM "${table}";`;
        try {
          const countResult = await pool.query(countQuery);
          console.log(`Table '${table}' contains ${countResult.rows[0].count} records.`);
          
          // Get the most recent record
          const recentQuery = `
            SELECT * FROM "${table}" 
            ORDER BY created_at DESC 
            LIMIT 1;
          `;
          try {
            const recentResult = await pool.query(recentQuery);
            if (recentResult.rowCount > 0) {
              console.log(`Most recent record in '${table}':`);
              console.table(recentResult.rows);
            } else {
              console.log(`No records found in '${table}'.`);
            }
          } catch (error) {
            console.log(`Could not get recent record from '${table}': ${error.message}`);
          }
        } catch (error) {
          console.log(`Could not count records in '${table}': ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error(`Error checking tables: ${error.message}`);
    if (error.stack) {
      console.error(`Error stack: ${error.stack}`);
    }
  } finally {
    await pool.end();
    console.log('Check completed');
  }
}

// Run the function
checkTables().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 