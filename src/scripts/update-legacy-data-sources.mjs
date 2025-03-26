// Script to update legacy data sources from 'ThaiWater' to 'HII'
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Load environment variables with explicit path
const envPath = path.resolve(backendRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
  console.warn(`Warning: .env file not found at ${envPath}, using process.env or default values`);
}

// Check for dry run mode
const DRY_RUN = process.argv.includes('--dry-run');

// Database configuration
let pool;

/**
 * Initialize database connection
 */
async function initDatabase() {
  console.log('Initializing database connection');
  
  try {
    // Create a database connection pool
    pool = new pg.Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 20, // Maximum number of clients
      idleTimeoutMillis: 30000 // Close idle clients after 30 seconds
    });
    
    // Test the database connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log(`Database connection established at ${result.rows[0].now}`);
    } finally {
      client.release();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize database connection', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabase() {
  try {
    if (pool) {
      console.log('Closing database connection');
      await pool.end();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection', error);
  }
}

/**
 * Update rainfall data sources
 */
async function updateRainfallDataSources() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Updating rainfall data sources from 'ThaiWater' to 'HII'...`);
  
  const client = await pool.connect();
  try {
    // Start transaction
    if (!DRY_RUN) {
      await client.query('BEGIN');
    }
    
    // First, count the records to be updated
    const countResult = await client.query(`
      SELECT COUNT(*) as count FROM thaiwater_rainfall_data_new
      WHERE data_source = 'ThaiWater'
    `);
    
    const recordsToUpdate = parseInt(countResult.rows[0].count);
    console.log(`Found ${recordsToUpdate} rainfall records with data_source='ThaiWater'`);
    
    if (recordsToUpdate === 0) {
      console.log('No records to update, exiting.');
      return { updated: 0 };
    }
    
    if (!DRY_RUN) {
      // Update the records
      const updateResult = await client.query(`
        UPDATE thaiwater_rainfall_data_new
        SET data_source = 'HII', updated_at = NOW()
        WHERE data_source = 'ThaiWater'
      `);
      
      console.log(`Updated ${updateResult.rowCount} rainfall records from 'ThaiWater' to 'HII'`);
      
      // Commit transaction
      await client.query('COMMIT');
      
      return { updated: updateResult.rowCount };
    } else {
      console.log(`[DRY RUN] Would update ${recordsToUpdate} rainfall records from 'ThaiWater' to 'HII'`);
      return { updated: recordsToUpdate };
    }
  } catch (error) {
    // Rollback transaction on error
    if (!DRY_RUN) {
      await client.query('ROLLBACK');
    }
    
    console.error('Failed to update rainfall data sources', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`Running in ${DRY_RUN ? 'DRY RUN' : 'LIVE'} mode`);
  console.log(`To run in dry-run mode (no database changes), use --dry-run flag`);
  
  try {
    // Initialize database
    await initDatabase();
    
    // Update rainfall data sources
    const rainfallResult = await updateRainfallDataSources();
    
    console.log('\nOperation completed successfully.');
    
    if (DRY_RUN) {
      console.log('\nThis was a DRY RUN. No changes were made to the database.');
      console.log('To apply changes, run the script without the --dry-run flag.');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  } finally {
    // Close database connection
    await closeDatabase();
  }
}

// Run the main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 