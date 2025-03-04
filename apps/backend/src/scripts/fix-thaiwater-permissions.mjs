// Script to fix permissions for ThaiWater tables
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fixes permissions for ThaiWater tables
 */
async function fixThaiWaterPermissions() {
  console.log('Fixing permissions for ThaiWater tables...');
  
  // Check if DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not defined');
    process.exit(1);
  }
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      console.log('Getting current database user...');
      const currentUserResult = await client.query('SELECT current_user');
      const currentUser = currentUserResult.rows[0].current_user;
      console.log(`Current database user: ${currentUser}`);
      
      // Get database name from connection string
      const dbUrl = new URL(process.env.DATABASE_URL);
      const dbName = dbUrl.pathname.substring(1); // Remove leading slash
      console.log(`Database name: ${dbName}`);
      
      // Grant permissions to the current user for ThaiWater tables
      console.log('Granting permissions to ThaiWater tables...');
      
      // Grant permissions to thaiwater_tele_stations
      await client.query(`
        GRANT ALL PRIVILEGES ON TABLE public.thaiwater_tele_stations TO "${currentUser}";
      `);
      console.log('Granted permissions to thaiwater_tele_stations');
      
      // Grant permissions to thaiwater_rainfall_data
      await client.query(`
        GRANT ALL PRIVILEGES ON TABLE public.thaiwater_rainfall_data TO "${currentUser}";
      `);
      console.log('Granted permissions to thaiwater_rainfall_data');
      
      // Grant permissions to sequences
      await client.query(`
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${currentUser}";
      `);
      console.log('Granted permissions to sequences');
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Permissions fixed successfully');
      
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      console.error('Error fixing permissions:', error);
      throw error;
    } finally {
      // Release client back to pool
      client.release();
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the function if this file is executed directly
fixThaiWaterPermissions()
  .then(() => {
    console.log('Permissions fixed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fixing permissions:', error);
    process.exit(1);
  }); 